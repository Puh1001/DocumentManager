import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to default locale dashboard (vi)
  redirect("/en/dashboard");
}
