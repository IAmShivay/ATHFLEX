type IconProps = { className?: string };

const base = "h-5 w-5";

export function HomeIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />
    </svg>
  );
}

export function OrdersIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m8 8 1.5-3h5L16 8m-8 0h8m-8 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2m-8 8h8"
      />
    </svg>
  );
}

export function TagIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Zm5.5-5.5h.01"
      />
    </svg>
  );
}

export function CustomersIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="8" r="3.2" />
      <path strokeLinecap="round" d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19M15.5 5.4a3.2 3.2 0 0 1 0 5.9M17.5 14.7c1.7.7 2.7 2 3 4.3" />
    </svg>
  );
}

export function ScanIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" />
    </svg>
  );
}

export function FactoryIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V9l6 4V9l6 4V5h3l1 16H3ZM7 17h2M12 17h2M17 17h1" />
    </svg>
  );
}

export function ReportIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h9l3 3v15H6V3Zm9 0v3h3M9 11h6M9 15h6M9 7h3" />
    </svg>
  );
}

export function AnalyticsIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M7 20v-7m5 7V6m5 14v-10" />
    </svg>
  );
}

export function SettingsIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.03 4.14l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.03Z"
      />
    </svg>
  );
}

export function SearchIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="6.5" />
      <path strokeLinecap="round" d="m16.5 16.5 4 4" />
    </svg>
  );
}

export function BellIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8Zm-3.4 10a2 2 0 0 1-3.2 0"
      />
    </svg>
  );
}

export function HelpIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M9.6 9a2.6 2.6 0 0 1 5 1c0 1.6-2.4 2-2.6 3.4m0 2.8h.01" />
    </svg>
  );
}

export function LogoutIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8 6 12l4 4M6 12h10"
      />
    </svg>
  );
}

export function StoreIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 9h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V9Zm-1-4.5h18L20 9H4L3 4.5ZM10 13.5h4"
      />
    </svg>
  );
}

export function ShopifyIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Zm3 0a4 4 0 0 1 8 0M9.5 12h5"
      />
    </svg>
  );
}

export function TrendUpIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 16 6-6 4 4 6-7M20 7h-5m5 0v5" />
    </svg>
  );
}

export function TrendDownIcon({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 8 6 6 4-4 6 7M20 17h-5m5 0v-5" />
    </svg>
  );
}

export function ChevronIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function LayersIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  );
}

export function CheckBadgeIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6l-8-3Zm-3.5 9 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function BoxesIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h8v8H3V8Zm10 0h8v8h-8V8ZM7 4h10M7 20h10" />
    </svg>
  );
}

export function PlugIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4" />
    </svg>
  );
}

export function WarehouseIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.5 12 4l9 5.5V20H3V9.5ZM8 20v-6h8v6" />
    </svg>
  );
}

export function CompassIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </svg>
  );
}

export function CartIcon({ className = base }: IconProps) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 11h10.6L20 7H6.2M9 20h.01M17 20h.01" />
    </svg>
  );
}
