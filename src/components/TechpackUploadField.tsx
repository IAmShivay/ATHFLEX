"use client";
import { useEffect, useId, useRef, useState } from "react";

export function TechpackUploadField({ category, title }: { category:string;title:string }) {
  const id=useId();
  const urls=useRef<string[]>([]);
  const [files,setFiles]=useState<{name:string;url:string|null}[]>([]);
  useEffect(()=>()=>{urls.current.forEach((url)=>URL.revokeObjectURL(url));},[]);
  return <div className="border border-neutral-300 bg-neutral-50 p-3">
    <label htmlFor={id} className="block text-sm font-medium">{title}</label>
    <input id={id} name={`file_${category}`} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx" multiple={category==="other"} className="mt-2 block w-full text-xs text-neutral-500 file:mr-2 file:border file:border-neutral-300 file:bg-white file:px-2 file:py-1 file:text-xs file:font-medium file:text-neutral-900" onChange={(event)=>{
      urls.current.forEach((url)=>URL.revokeObjectURL(url));urls.current=[];
      setFiles(Array.from(event.currentTarget.files??[]).map((file)=>{const url=["image/jpeg","image/png","image/webp"].includes(file.type)?URL.createObjectURL(file):null;if(url)urls.current.push(url);return {name:file.name,url};}));
    }}/>
    <div className="mt-2 space-y-2">{files.map((file,index)=><div key={`${file.name}-${index}`}>{file.url&&<a href={file.url} target="_blank" rel="noreferrer" aria-label={`Preview ${file.name}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={file.url} alt={file.name} className="h-32 w-full border border-neutral-200 bg-white object-contain"/>
    </a>}<p className="mt-1 break-all text-xs text-neutral-500">{file.name}</p></div>)}</div>
  </div>;
}
