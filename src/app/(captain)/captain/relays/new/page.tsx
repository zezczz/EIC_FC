import { RelayForm } from "@/components/captain/relay-form";

export const metadata = { title: "新建接龙", robots: { index: false } };

export default function NewRelayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">新建活动接龙</h1>
        <p className="text-muted-foreground text-sm">保存后在列表中开放报名。</p>
      </div>
      <RelayForm />
    </div>
  );
}
