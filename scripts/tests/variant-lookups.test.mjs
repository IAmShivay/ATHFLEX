import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name], Response, URL, AbortSignal, ...globals });
  return exports;
}
const variant = { id:'gid://shopify/ProductVariant/123',title:'Black / M',sku:'AF-BLACK-M',product:{id:'gid://shopify/Product/456',title:'Jogger'} };
function lookups() {
  const calls = [];
  const state = { response: {data:{productVariants:{nodes:[variant]}}}, status:200, fail:false };
  const api = load('src/lib/shopify-variants.ts', {'./shopify':{storeDomain:()=> 'example.myshopify.com',getAccessToken:async()=>({token:'test-only-token'})}}, {
    fetch:async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});if(state.fail)throw new Error('timeout');return Response.json(state.response,{status:state.status});},
  });
  return {api,calls,state};
}

test('variant search makes one bounded GraphQL lookup and treats search operators literally', async()=>{
  const {api,calls}=lookups();
  const result=await api.searchShopifyVariants('Jogger OR sku:*');
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/2026-10\/graphql.json$/);
  assert.match(calls[0].body.query,/first: 30/);
  assert.equal(calls[0].body.variables.query,'Jogger* AND "OR" AND sku\\:\\**');
  assert.equal(calls[0].init.cache,'no-store');
  assert.ok(calls[0].init.signal);
  assert.equal(result.options[0].id,'123');
  assert.equal(result.options[0].productId,'456');
});
test('mapping validation fetches only selected IDs in a single request',async()=>{
  const {api,calls,state}=lookups(); state.response={data:{nodes:[variant,null]}};
  const result=await api.getSelectedShopifyVariants(['123','123','999']);
  assert.equal(calls.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].body.variables.ids)),['gid://shopify/ProductVariant/123','gid://shopify/ProductVariant/999']);
  assert.equal(result.options.length,1);
});
test('empty or invalid mapping selections never contact Shopify',async()=>{
  const {api,calls}=lookups();
  assert.equal((await api.getSelectedShopifyVariants([])).options.length,0);
  assert.ok((await api.getSelectedShopifyVariants(['not-an-id'])).error);
  assert.ok((await api.getSelectedShopifyVariants(Array.from({length:101},(_,i)=>String(i)))).error);
  assert.ok((await api.searchShopifyVariants('x'.repeat(101))).error);
  assert.equal(calls.length,0);
});
test('Shopify errors and timeouts are visible and do not become successful empty lookups',async()=>{
  const {api,state}=lookups();
  state.response={errors:[{message:'THROTTLED'}]};assert.ok((await api.searchShopifyVariants('AF')).error);
  state.status=401;assert.match((await api.searchShopifyVariants('AF')).error,/Reconnect/);
  state.fail=true;assert.match((await api.searchShopifyVariants('AF')).error,/timed out/);
});
test('variant endpoint checks current permissions before contacting Shopify and forbids public caching',async()=>{
  let user=null, permitted=false, calls=0;
  const route=load('src/app/api/shopify/variants/route.ts',{
    '@/lib/dal':{getOptionalUser:async()=>user},
    '@/lib/permissions':{hasPermission:()=>permitted},
    '@/lib/shopify-variants':{searchShopifyVariants:async()=>{calls++;return {options:[]};}},
  });
  const request=new Request('https://example.invalid/api/shopify/variants?q=AF');
  assert.equal((await route.GET(request)).status,401);
  user={id:1};assert.equal((await route.GET(request)).status,403);
  assert.equal(calls,0);
  permitted=true;
  const response=await route.GET(request);
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(calls,1);
});

function catalog({ token = 'test-only-token', link } = {}) {
  const cacheCalls=[], queries=[];
  const api=load('src/lib/shopify.ts',{
    'node:crypto':{},
    './db':{query:async(sql)=>{queries.push(sql);return {rows:[]};}},
    'next/cache':{revalidateTag:()=>{},unstable_cache:(fn,_keys,options)=>async(...args)=>{cacheCalls.push({args,options});return fn(...args);}},
  },{
    process:{env:{SHOPIFY_STORE_DOMAIN:'example.myshopify.com',SHOPIFY_ADMIN_ACCESS_TOKEN:token}},
    console:{error:()=>{}},
    fetch:async()=>Response.json({products:[{id:1,title:'Jogger',handle:'jogger',status:'active',vendor:'Test',product_type:'Clothing',images:[{src:'https://example.invalid/image.png',metadata:'x'.repeat(100000)}],variants:[{id:2,title:'M',sku:'AF-M',price:'100',inventory_quantity:3,unusedMetadata:'x'.repeat(100000)}]}]},{headers:link?{link}:{}}),
  });
  return {api,cacheCalls,queries};
}
test('catalog cache receives compact product fields instead of oversized Shopify metadata',async()=>{
  const {api,cacheCalls}=catalog();
  const result=await api.fetchShopifyProducts();
  assert.equal(result.products[0].variants[0].sku,'AF-M');
  assert.equal(result.products[0].variants[0].unusedMetadata,undefined);
  assert.equal(result.products[0].images,undefined);
  assert.ok(JSON.stringify(result.products).length<1000);
  assert.equal(cacheCalls[0].options.revalidate,60);
  assert.deepEqual(Array.from(cacheCalls[0].options.tags),['shopify-products']);
  assert.deepEqual(Array.from(cacheCalls[0].args),['example.myshopify.com','test-only-token']);
});
test('catalog checks the current connection before cache access and never returns partial invalid pagination',async()=>{
  const disconnected=catalog({token:''});
  assert.ok((await disconnected.api.fetchShopifyProducts()).error);
  assert.equal(disconnected.cacheCalls.length,0);
  assert.ok(disconnected.queries.every(sql=>sql.startsWith('SELECT')));
  const invalid=catalog({link:'<https://other.myshopify.com/admin/api/2025-01/products.json>; rel="next"'});
  const result=await invalid.api.fetchShopifyProducts();
  assert.match(result.error,/invalid catalog page/);
  assert.equal(result.products.length,0);
});
