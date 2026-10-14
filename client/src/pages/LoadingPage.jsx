import { ShieldCheck } from "lucide-react";
export default function LoadingPage() {
  return (
    <div className="loading-page" role="status">
      <ShieldCheck size={40} />
      <strong>SecurMask</strong>
      <span className="loading-spinner" />
      <p>Opening your privacy workspace…</p>
    </div>
  );
}
