import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

const projects = [
  {
    name: "API Service",
    href: "/environment",
    badge: "Active",
    badgeClass: "bg-primary-fixed text-on-primary-fixed-variant",
    accent: true,
    desc: "Main backend microservices handling authentication, billing, and data orchestration across clusters.",
    secrets: 156,
    team: 8,
    sync: "Synced 2m ago",
    syncClass: "text-on-tertiary-fixed-variant",
    syncDot: "bg-primary animate-pulse",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDPUGcUJGpUCoLirvRvnQp88rV3_MMDWTNlh1zCEykyYTt4GiBc49Mquu2V-4WeBkVgBShXhWJXEtu6yIUVaapanZKvzXsuVPfTPsUS9BUazoEDPL_AG1E_PWluWgmCeDusthHF6K8Wdzt6TWIshnVZyy6brhebibia4jEiBPEcbjfGBoOgBnn8h1LL2j5fFyHBPqinurYfVhyKr7izMDUw15jCQpEvqkXgvhXXiAw38uTifnrH4BJbRpBSL-9Zij_P3oL2BkNE6ZM1",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD7B-PKXxMh6u7ZsfuY5weLNiqcxYXNn6gkhhKZw80ow-ugn-2qkMpgCUbPkXldxbzhWLiatnEhRbT22iMZl29zhGpiSC2RM1S_V0DrBTLa4PRCY2OysBDZHZrdpQQemUYw56DdaTnvdxsoThrm6vygEV72yOPSh1opUAE1nK-oS6uX7hMAPeYMRp9PpeGhnc4d3oHF7t6HMY3zr_cfsTkJz60k__OiZmm83VCdzqX9lFQsLh4MhDONI4-JAP99dql6QxKiJINhfnL_",
    ],
    extra: "+6",
  },
  {
    name: "Frontend Web",
    href: "/environment",
    badge: "Internal",
    badgeClass: "bg-secondary-container text-on-secondary-container",
    accent: false,
    desc: "React-based dashboard and landing page assets. Shared environment variables for Vercel deployments.",
    secrets: 42,
    team: 12,
    sync: "Synced 4h ago",
    syncClass: "text-secondary",
    syncDot: "bg-outline",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDocCkVCDBHUHn1Z3dBqCWQs45jNhY0kppIISL-JlmbAcrDO0bEujK5VYS5ta773matleTCtdOH_pTFXuZu1-sOYolNW643v1DRreHQeskdXJAwifyaQ6Di1CQkvtaxPd8FHHsArRncDlIn6y83xDaStSPTVpJXA_fTvg7qs65JOZTjvEJ2-_mRtHPC_pEQN-nL6-JSSndSADoeefvFfEqPUGrePXVgE9p2ESDHNrqQPs8FlR4WeVu3PqW2JRl801PHdMbieMK40u7y",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqYhJciBA3E1yO2-VnO2gZsuC6VQ_82ArGRVAtWzLHEATJB_5Ja5I9OYWF2eb0KcYCdcwV4dWvM4IfVGzrz1kf8PTpAigHL4aJEYT62F85B6LQCGWeVwPqyeW65sh4d-D2Y4mY3mhgsYY_IwBU6qfw5HHYpKShVwmtHQ3a1jLeKOFX1QZViQMB4_XNWIgZI6ZUSjA7w0hshXgyejmP-KU0DCnowbgE6KM6NuKd0OZNbasD2shCDY6gJlGRfp782LUMUCS-16Q1TGpD",
    ],
    extra: "+10",
  },
  {
    name: "Mobile App",
    href: "/environment",
    badge: "Critical",
    badgeClass: "bg-error-container text-on-error-container",
    accent: false,
    desc: "iOS and Android applications. Includes sensitive API keys for push notifications and analytics.",
    secrets: 88,
    team: 4,
    sync: "Out of sync",
    syncClass: "text-error",
    syncDot: "bg-error",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB9Y4fZ9ESlcAiU0Sq4Uh6oscB-0ph_A9wRCJNBLWxu4DI_4Y34OvKqqxkZVRHX5PBq_fHlRutSi95tJPBs3pEOE-5hSzf_ikFjjrEyv7PXexLj1zaVlk_Dh6YbYm14_tsDtXQkkRv2OViW4UcHio1pBIzdomFDDHbqbsOG49sZoUazkHPGh6sXwqPxpbUg-HZFsq9Ii8kFtozUh0rNp1LCPhKWAA0eMp43F5jT_vh_XJ_K7cPv7eHtB5dZGXysivc0ILkabsI0DEcC",
    ],
    extra: "+2",
  },
  {
    name: "Data Processing",
    href: "/environment",
    badge: "Active",
    badgeClass: "bg-primary-fixed text-on-primary-fixed-variant",
    accent: true,
    desc: "Python-based ETL pipelines and Spark clusters for nightly analytical reports.",
    secrets: 214,
    team: 5,
    sync: "Synced 12m ago",
    syncClass: "text-on-tertiary-fixed-variant",
    syncDot: "bg-primary animate-pulse",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDNH1OR0wNSx1AJGhUh3azPYS2nyXBMPreG5SVkbRj5xYcxkdfjIY9jEUwp-X05QJfNuJc4uD6hBIO_jBegyPgimmAN5LmGlM4jtmMVh6E4m4kOJcXXXZL0b7L12PE0gAzqf13TCCIrN4oyEa-9nDzlW211wUUuFKHjlyvg05EML5Og7zfkdC58bTbkeg2mDYhMuB6gx4TFAEF7VjALelY_W0HnSXlNNR37VMuXs_kK8xlGS-DliXR2YCSS6DcUQucqKY1T00LzTxUa",
    ],
    extra: "+4",
  },
  {
    name: "Auth Provider",
    href: "/environment",
    badge: "System",
    badgeClass: "bg-secondary-container text-on-secondary-container",
    accent: false,
    desc: "Custom OIDC provider implementation for enterprise SSO and multi-tenant isolation.",
    secrets: 12,
    team: 2,
    sync: "Synced 1d ago",
    syncClass: "text-secondary",
    syncDot: "bg-outline",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBwUx91KoxIVmwk_VlZo690zKupSGA6223F-UXoY9nsTPZfJiKsR8ZiCU5TBc2TkFykbg9gBF231qt2DpFMr-4KYg01eqcGhMBGS-AMF-5LJOoYn6uNzOaf0WXvBIPoNNKBxbzmrMiEN6Q_nAT1xa2U2qWXlUkzb-SzdOLUpDVUbVnd9vXED8JWMW6bJ7DQALE0Laffi4QVX3ecmTyhogWK2iUHyfUjIYDXa30SSIQrVoM9u4dudrY_zd7PeVJgfZGAzJzCt5jsz43X",
    ],
    extra: "+1",
  },
];

const audits = [
  {
    icon: "edit",
    iconClass: "text-primary",
    key: "STRIPE_API_KEY",
    project: "API Service",
    member: "Sarah Jenkins",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCLLC9hp2vfCqcnkVsqjJm0IfV1hKD9gnwCvtq82USjr8YpKaextJe42cUKdF-x1HQxLNay3YtNlDbJz-oxKwufvLUQxF-IhGzzvGtYK_t4qaGatA9XgOF-B1ZU2Cn3I2gpudONKNR3MzC-7P1s80OyFoAzUWRIPDxPTSKA12r613jpHafmzEwt-4KA9IgasElM7SsXekwcNlCjumZMXEG1Hk6kzPTYdYlMK_otOLgWEOOt_Q-_rBHH7jJTI35LibutKaRPlymDTINa",
    time: "2m ago",
  },
  {
    icon: "add",
    iconClass: "text-tertiary",
    key: "NEXT_PUBLIC_GA_ID",
    project: "Frontend Web",
    member: "Marcus Wei",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDJLOcsJPPU5PNaX7q2nf8ePBpFvs9yQ12Nndf1EnqPo8ghJ_V-FY5YU6kWRid0VjP12biIndudsVFy_42kAe6V3dvgn-zIWsshaI7mP58jlpz61HYUya4x-BQQLOEUbTQGyUprRENpMGruZXmCI77PMc5Gqgofnq0QhoDMB7AZsF-sj0UmGSm3VZ9BoDIwH0EpOvxGAL7gpCBOSl-NVJTTVeCUdhJFnzgvL-VcyIsnn_WFbOq3HyoOGKMm9tr1tIG_CC8JBDJNxo0D",
    time: "45m ago",
  },
  {
    icon: "delete",
    iconClass: "text-error",
    key: "OLD_LEGACY_TOKEN",
    project: "Mobile App",
    member: "Robert Chen",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCpmEahEeuQhqHsrvXKok2K7GUtNqe1bulGJoV01r1ggXhaTe3a4zeXeFoIm920wgxq7SIpQUS5KH1Tm4-Z1E7vzl-vfSMQwC-SQjBzR-q7xVgnWK_OLxxCH85UuvO_y4nr_Tpz55p9vHDLyVlVk7psfIQ53DIk81hduJsziLuS8SJYNzDiDxPV7xWB4fDqH2oVCTDUi7iy2WEDzSs_Vwo0f5oLhHEtRrnOGYYuK1hlezl9KN4BJNsYjJX2Wsm2OFT7waRROlrJ5D6G",
    time: "2h ago",
  },
];

export default function ProjectsPage() {
  return (
    <AppShell searchPlaceholder="Search projects...">
      <div className="mx-auto max-w-container-max pb-xl">
        <div className="mb-xl flex flex-col justify-between gap-md md:flex-row md:items-center">
          <div>
            <h1 className="font-h1 text-h1 text-on-surface">EnvSync Projects</h1>
            <p className="mt-base font-body-md text-body-md text-secondary">
              Manage environment variables and secrets for your organization.
            </p>
          </div>
          <div className="flex gap-sm">
            <button
              type="button"
              className="flex items-center gap-xs rounded border border-outline-variant bg-surface-container-low px-md py-sm font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <Icon name="filter_list" style={{ fontSize: 18 }} />
              Filter
            </button>
            <button
              type="button"
              className="flex items-center gap-xs rounded border border-primary bg-primary-container px-md py-sm font-label-md text-label-md text-on-primary-container transition-all hover:brightness-110"
            >
              <Icon name="add" style={{ fontSize: 18 }} />
              Create Project
            </button>
          </div>
        </div>

        <div className="mb-xl grid grid-cols-1 gap-md md:grid-cols-3">
          <div className="github-card flex items-center gap-md rounded-lg p-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
              <Icon name="database" />
            </div>
            <div>
              <div className="font-body-sm text-body-sm text-secondary">
                Total Secrets
              </div>
              <div className="font-h2 text-h2 text-on-surface">1,248</div>
            </div>
          </div>
          <div className="github-card flex items-center gap-md rounded-lg p-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
              <Icon name="group" />
            </div>
            <div>
              <div className="font-body-sm text-body-sm text-secondary">
                Collaborators
              </div>
              <div className="font-h2 text-h2 text-on-surface">24</div>
            </div>
          </div>
          <div className="github-card flex items-center gap-md rounded-lg p-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface">
              <Icon name="sync" />
            </div>
            <div>
              <div className="font-body-sm text-body-sm text-secondary">
                Active Syncs
              </div>
              <div className="font-h2 text-h2 text-on-surface">89%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.name}
              className={`github-card group flex min-h-[180px] flex-col justify-between rounded-lg p-md ${
                project.accent ? "active-project-accent" : ""
              }`}
            >
              <div>
                <div className="mb-sm flex items-start justify-between">
                  <h3
                    className={`font-h3 text-h3 ${
                      project.accent
                        ? "text-primary group-hover:underline"
                        : "text-on-surface transition-colors group-hover:text-primary"
                    }`}
                  >
                    <Link href={project.href}>{project.name}</Link>
                  </h3>
                  <span
                    className={`rounded px-xs py-[2px] text-[10px] font-bold uppercase tracking-wider ${project.badgeClass}`}
                  >
                    {project.badge}
                  </span>
                </div>
                <p className="mb-md line-clamp-2 font-body-sm text-body-sm text-secondary">
                  {project.desc}
                </p>
              </div>
              <div className="space-y-md">
                <div className="flex items-center gap-md font-body-sm text-body-sm text-secondary">
                  <div className="flex items-center gap-xs">
                    <Icon name="lock" style={{ fontSize: 16 }} />
                    <span>{project.secrets} Secrets</span>
                  </div>
                  <div className="flex items-center gap-xs">
                    <Icon name="group" style={{ fontSize: 16 }} />
                    <span>{project.team} Team</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-outline-variant pt-sm">
                  <div
                    className={`flex items-center gap-xs text-[12px] font-medium ${project.syncClass}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${project.syncDot}`}
                    />
                    {project.sync}
                  </div>
                  <div className="flex -space-x-2">
                    {project.avatars.map((src) => (
                      <img
                        key={src.slice(-20)}
                        src={src}
                        alt=""
                        className="h-6 w-6 rounded-full border-2 border-white object-cover"
                      />
                    ))}
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-surface-variant text-[10px] font-bold text-on-surface">
                      {project.extra}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            className="github-card group flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-sm rounded-lg border-dashed p-md text-secondary transition-all hover:border-primary hover:text-primary"
          >
            <Icon
              name="add_circle"
              className="transition-transform group-hover:scale-110"
              style={{ fontSize: 48 }}
            />
            <span className="font-label-md text-label-md">
              New Project Container
            </span>
          </button>
        </div>

        <div className="mt-xl">
          <h2 className="mb-md font-h2 text-h2 text-on-surface">
            Audit Activity
          </h2>
          <div className="github-card overflow-hidden rounded-lg">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-outline-variant bg-surface-container-low">
                <tr>
                  {["Action", "Project", "Member", "Time"].map((h) => (
                    <th
                      key={h}
                      className="px-md py-sm font-label-md text-label-md text-on-surface"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {audits.map((row) => (
                  <tr
                    key={row.key}
                    className="cursor-pointer transition-colors hover:bg-surface-bright"
                  >
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-xs">
                        <Icon
                          name={row.icon}
                          className={row.iconClass}
                          style={{ fontSize: 18 }}
                        />
                        <span className="font-code-md text-code-md text-on-surface">
                          {row.key}
                        </span>
                      </div>
                    </td>
                    <td className="px-md py-sm font-body-sm text-body-sm text-on-surface">
                      {row.project}
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-xs">
                        <img
                          src={row.avatar}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover"
                        />
                        <span className="font-body-sm text-body-sm text-on-surface">
                          {row.member}
                        </span>
                      </div>
                    </td>
                    <td className="px-md py-sm font-body-sm text-body-sm text-secondary">
                      {row.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
