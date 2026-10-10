import { AccountForm } from "@/components/account-form";
import { Notice } from "@/components/notice";
import { firstParam } from "@/lib/domain/text";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl text-pine">Account</h1>
      <p className="mt-2 mb-6 text-muted">Change the password for this staff account.</p>
      <Notice notice={firstParam(query.notice)} />
      <AccountForm />
    </>
  );
}
