import { isGscConnected, getGscSiteUrl, fetchSearchAnalytics } from "@/lib/gsc";
import SearchConsolePanel from "@/components/admin/SearchConsolePanel";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    "Google Search Console isn't configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables first (see the setup notes below).",
  denied: "The Google sign-in was cancelled or denied.",
  token_exchange_failed: "Google didn't accept the sign-in. Please try connecting again.",
};

export default async function SearchConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { error } = await searchParams;
  const connected = await isGscConnected();
  const siteUrl = connected ? await getGscSiteUrl() : null;
  const hasCredentials = !!process.env.GOOGLE_CLIENT_ID;

  const [queries, pages] = connected && siteUrl
    ? await Promise.all([fetchSearchAnalytics("query", 15), fetchSearchAnalytics("page", 15)])
    : [[], []];

  return (
    <div>
      <h1 className="text-2xl font-bold">Search Console</h1>
      <p className="mt-1 text-sm text-gray-500">
        Real search performance data from Google — clicks, impressions, and top queries — for the
        last 28 days.
      </p>

      {error && ERROR_MESSAGES[error] ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {ERROR_MESSAGES[error]}
        </div>
      ) : null}

      <div className="mt-6 max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        {!connected ? (
          <div>
            <p className="mb-3 text-sm text-gray-500">Not connected yet.</p>
            {hasCredentials ? (
              <a
                href="/api/gsc/auth"
                className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Connect Google Search Console
              </a>
            ) : (
              <p className="text-sm text-gray-400">
                Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your
                environment variables to enable the &quot;Connect&quot; button — see the setup
                notes below.
              </p>
            )}
          </div>
        ) : (
          <SearchConsolePanel currentSiteUrl={siteUrl} />
        )}
      </div>

      {connected && siteUrl ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 font-semibold">Top Queries</h2>
            {queries.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="pb-2">Query</th>
                    <th className="pb-2 text-right">Clicks</th>
                    <th className="pb-2 text-right">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {queries.map((row) => (
                    <tr key={row.keys.join("|")}>
                      <td className="py-2">{row.keys[0]}</td>
                      <td className="py-2 text-right">{row.clicks}</td>
                      <td className="py-2 text-right">{row.impressions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">
                No data yet — either the site is new to Google, or there was no search activity in
                the last 28 days.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 font-semibold">Top Pages</h2>
            {pages.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="pb-2">Page</th>
                    <th className="pb-2 text-right">Clicks</th>
                    <th className="pb-2 text-right">Impressions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {pages.map((row) => (
                    <tr key={row.keys.join("|")}>
                      <td className="max-w-[16rem] truncate py-2" title={row.keys[0]}>
                        {row.keys[0]}
                      </td>
                      <td className="py-2 text-right">{row.clicks}</td>
                      <td className="py-2 text-right">{row.impressions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400">No data yet.</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-6 max-w-2xl rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-500 dark:border-gray-700">
        <p className="font-medium text-gray-700 dark:text-gray-300">One-time setup</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            In{" "}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              className="text-indigo-600 hover:underline"
            >
              Google Cloud Console
            </a>
            , create an OAuth Client ID (type: Web application).
          </li>
          <li>
            Add <code>{"<your site URL>"}/api/gsc/callback</code> as an authorized redirect URI.
          </li>
          <li>Enable the &quot;Google Search Console API&quot; for that project.</li>
          <li>
            Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> as environment
            variables on Render.
          </li>
          <li>
            Make sure your site is verified as a property in{" "}
            <a
              href="https://search.google.com/search-console"
              target="_blank"
              className="text-indigo-600 hover:underline"
            >
              Google Search Console
            </a>{" "}
            itself — this connection reads data, it doesn&apos;t verify ownership for you.
          </li>
        </ol>
      </div>
    </div>
  );
}
