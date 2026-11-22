import type { NavIconKey } from "@/lib/navigation";
import {
  AnalyticsIcon,
  BoxesIcon,
  CartIcon,
  CheckBadgeIcon,
  CompassIcon,
  CustomersIcon,
  FactoryIcon,
  HomeIcon,
  LayersIcon,
  OrdersIcon,
  PlugIcon,
  ReportIcon,
  ScanIcon,
  SettingsIcon,
  TagIcon,
  TrendUpIcon,
  WarehouseIcon,
} from "./icons";

const ICONS: Record<NavIconKey, (props: { className?: string }) => React.JSX.Element> = {
  home: HomeIcon,
  techpack: TagIcon,
  materials: LayersIcon,
  sku: BoxesIcon,
  approval: CheckBadgeIcon,
  po: OrdersIcon,
  jobber: FactoryIcon,
  scan: ScanIcon,
  report: ReportIcon,
  analytics: AnalyticsIcon,
  users: CustomersIcon,
  settings: SettingsIcon,
  plug: PlugIcon,
  inventory: WarehouseIcon,
  forecast: TrendUpIcon,
  planning: CompassIcon,
  purchase: CartIcon,
};

export default function NavIcon({ name, className }: { name: NavIconKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
