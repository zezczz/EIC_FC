import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** 公开自助注册已关闭；队员由队长后台开通。 */
export default function RegisterPage() {
  redirect("/login");
}
