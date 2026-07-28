import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-[#F6F8FA] font-body-md text-body-md text-on-surface antialiased">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-inverse-surface p-xl lg:flex">
        <Link href="/" className="font-h2 text-h2 font-black text-primary-fixed-dim">
          EnvSync
        </Link>
        <div className="relative z-10 max-w-md">
          <div className="mb-md flex h-12 w-12 items-center justify-center rounded-lg bg-primary-container/20">
            <Icon name="enhanced_encryption" className="text-primary-container" filled />
          </div>
          <h2 className="mb-md font-h1 text-h1 text-inverse-on-surface">
            Encrypted secrets. Zero-knowledge by design.
          </h2>
          <p className="font-body-lg text-body-lg text-surface-dim">
            AES-256 encryption, role-based access, and a CLI that keeps plaintext
            off disk until you need it.
          </p>
        </div>
        <p className="relative z-10 font-body-sm text-body-sm text-surface-dim">
          Trusted by developers shipping production every day.
        </p>
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary-container/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-tertiary/10 blur-3xl" />
      </div>

      <div className="flex w-full flex-col items-center justify-center px-margin-mobile py-xl lg:w-1/2 md:px-xl">
        <div className="mb-lg w-full max-w-md lg:hidden">
          <Link href="/" className="font-h2 text-h2 font-black text-primary">
            EnvSync
          </Link>
        </div>
        <AuthCard mode="login" />
      </div>
    </div>
  );
}
