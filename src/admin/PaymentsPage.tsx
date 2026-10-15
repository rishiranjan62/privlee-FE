import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";
import { saveFile } from "../lib/download";
import type {
  Granularity,
  LedgerPage,
  PaymentMember,
  PaymentMetric,
  PaymentOrderPage,
  PaymentOrderRow,
  PaymentsSummary,
} from "../lib/types";
import RefreshButton from "./RefreshButton";
import TrendChart, { bucketLabel } from "./TrendChart";

const field = "rounded border border-line bg-white px-2.5 py-2 text-sm outline-none focus:border-gold";
const card = "rounded-lg border border-line bg-white";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "orders", label: "Orders" },
  { id: "ledger", label: "Credit ledger" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom dates" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Every status" },
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending (under an hour)" },
  { value: "ABANDONED", label: "Abandoned" },
  { value: "FAILED", label: "Failed" },
  { value: "MISMATCH", label: "Paid the wrong amount" },
  { value: "STUCK", label: "Unpaid for over 15 minutes" },
];

const REASON_OPTIONS = [
  { value: "", label: "Every kind" },
  { value: "PURCHASE", label: "Credits purchased" },
  { value: "WELCOME_BONUS", label: "Welcome bonus" },
  { value: "ADMIN_GRANT", label: "Credits from Privlee (staff)" },
  { value: "COLD_MESSAGE", label: "Message to a non-match" },
  { value: "GIFT_SENT", label: "Gift sent" },
  { value: "EXTRA_LIKE", label: "Extra like" },
  { value: "PHOTO_REQUEST", label: "Photo request" },
  { value: "PRIVATE_REQUEST", label: "Private photos request" },
  { value: "PRIVATE_UNLOCK", label: "Private photos unlocked" },
];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (n - 1));
  return isoDay(d);
}

/** Packs are named by their price in rupees, so "500" is the ₹500 pack. */
function packName(id: string): string {
  return /^\d+$/.test(id) ? `₹${Number(id).toLocaleString("en-IN")} pack` : id;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function change(m: PaymentMetric): { text: string; tone: "up" | "down" | "flat" } {
  if (m.previous === 0) return m.value === 0 ? { text: "no change", tone: "flat" } : { text: "new", tone: "up" };
  const pct = Math.round(((m.value - m.previous) / m.previous) * 100);
  if (pct === 0) return { text: "no change", tone: "flat" };
  return { text: `${pct > 0 ? "▲ +" : "▼ "}${pct}%`, tone: pct > 0 ? "up" : "down" };
}

// ---------------------------------------------------------------- small pieces

function StatusChip({ row }: { row: Pick<PaymentOrderRow, "status" | "failureReason"> }) {
  if (row.status === "FAILED" && row.failureReason === "AMOUNT_MISMATCH") {
    return (
      <span className="rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white" title="Paid, but not for the amount that was ordered. No credits were added.">
        Wrong amount
      </span>
    );
  }
  const style: Record<string, string> = {
    PAID: "bg-[#e3f1e8] text-[#25613c]",
    PENDING: "bg-[#e6eefb] text-[#2c4f8a]",
    ABANDONED: "bg-[#efede8] text-muted",
    FAILED: "bg-[#fbe5e3] text-danger",
  };
  const text: Record<string, string> = { PAID: "Paid", PENDING: "Pending", ABANDONED: "Abandoned", FAILED: "Failed" };
  const title =
    row.status === "FAILED" ? "Could not be started with Cashfree. Nothing was taken." : row.status === "ABANDONED" ? "Started, but never paid." : undefined;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${style[row.status]}`} title={title}>
      {text[row.status]}
    </span>
  );
}

function MemberCell({ member }: { member: PaymentMember }) {
  return (
    <div className="min-w-0">
      <Link to={`/admin/users/${member.userId}`} className="font-medium text-ink hover:text-gold hover:underline">
        {member.pseudonym}
      </Link>
      {member.deleted && <span className="ml-1.5 text-[10px] uppercase text-muted">left</span>}
      <p className="truncate text-xs text-muted">{member.email}</p>
    </div>
  );
}

function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const from = total === 0 ? 0 : page * size + 1;
  const to = Math.min(total, (page + 1) * size);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <span>
        {from}–{to} of {total.toLocaleString()}
      </span>
      <span className="flex gap-2">
        <button disabled={page === 0} onClick={() => onPage(page - 1)} className="rounded border border-line bg-white px-3 py-1.5 transition hover:border-gold disabled:opacity-40">
          ← Newer
        </button>
        <button disabled={to >= total} onClick={() => onPage(page + 1)} className="rounded border border-line bg-white px-3 py-1.5 transition hover:border-gold disabled:opacity-40">
          Older →
        </button>
      </span>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-muted">
      {label}
      {children}
    </label>
  );
}

// ---------------------------------------------------------------- the page

export default function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "overview") as Tab;

  // The range and step belong to the Overview; the Orders and Credit ledger tabs filter on their own.
  const [step, setStep] = useState<Granularity>("day");
  const [range, setRange] = useState("30");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<PaymentsSummary | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const lastReloads = useRef(0);

  const query = useMemo(() => {
    if (range === "custom") return from ? { from, to } : null;
    return { from: daysAgo(Number(range)), to: "" };
  }, [range, from, to]);

  useEffect(() => {
    if (tab !== "overview" || !query) return;
    let current = true;
    if (reloads === lastReloads.current) setData(null);
    lastReloads.current = reloads;
    setFailed(null);
    setRefreshing(true);
    api
      .getPaymentsSummary(step, query.from, query.to || undefined)
      .then((d) => {
        if (!current) return;
        setData(d);
        setUpdatedAt(new Date());
      })
      .catch((e) => current && setFailed(e?.response?.data?.message ?? "Could not load the payments report."))
      .finally(() => current && setRefreshing(false));
    return () => {
      current = false;
    };
  }, [tab, step, query, reloads]);

  function go(next: Tab, extra: Record<string, string> = {}) {
    setParams({ tab: next, ...extra });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="mt-1 text-sm text-muted">
            Money taken for credits, and where credits go. Amounts are in rupees; dates are UTC.
          </p>
        </div>
        <RefreshButton onClick={() => setReloads((n) => n + 1)} busy={refreshing} updatedAt={updatedAt} />
      </div>

      {data && <GatewayBanner gateway={data.gateway} />}
      {data && <TaxBanner data={data} onIssued={() => setReloads((n) => n + 1)} />}

      <div role="tablist" className="mt-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => go(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "border-gold text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Overview
          data={data}
          failed={failed}
          step={step}
          setStep={setStep}
          range={range}
          setRange={setRange}
          from={from}
          setFrom={setFrom}
          to={to}
          setTo={setTo}
          haveQuery={Boolean(query)}
          go={go}
        />
      )}
      {tab === "orders" && <OrdersTab key={params.toString()} initial={Object.fromEntries(params)} reloads={reloads} onChanged={() => setReloads((n) => n + 1)} />}
      {tab === "ledger" && <LedgerTab key={params.toString()} initial={Object.fromEntries(params)} reloads={reloads} />}
    </div>
  );
}

/** Tells the admin, before anything else, whether real money is moving. */
function GatewayBanner({ gateway }: { gateway: PaymentsSummary["gateway"] }) {
  if (!gateway.enabled) {
    return (
      <p className="mt-4 rounded border border-line bg-white px-4 py-3 text-sm text-muted">
        <strong className="text-ink">Buying is switched off.</strong> No Cashfree keys are set on the server, so members can't buy credits yet.
        Orders below are whatever was recorded before.
      </p>
    );
  }
  if (gateway.environment.toLowerCase() !== "production") {
    return (
      <p className="mt-4 rounded border border-[#e5c68a] bg-[#fbf1dc] px-4 py-3 text-sm text-[#7a5412]">
        <strong>Test mode.</strong> The server is using Cashfree's sandbox: these payments are rehearsals and no real money is moving.
        Set <code>CASHFREE_ENVIRONMENT=production</code> with live keys to take real payments.
      </p>
    );
  }
  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded border border-line bg-white px-3 py-1.5 text-xs text-muted">
      <span className="h-2 w-2 rounded-full bg-[#2f9e5b]" /> Live — real payments through Cashfree
    </p>
  );
}

/** GST: how prices are taxed, whether invoices are being issued, and what is missing if not. */
function TaxBanner({ data, onIssued }: { data: PaymentsSummary; onIssued: () => void }) {
  const t = data.tax;
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function issueMissing() {
    setBusy(true);
    setMessage(null);
    try {
      const n = await api.issueMissingInvoices();
      setMessage(`Issued ${n} ${n === 1 ? "invoice" : "invoices"}.`);
      onIssued();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not issue the invoices.");
    } finally {
      setBusy(false);
    }
  }

  if (!t.invoicesEnabled) {
    return (
      <div className="mt-3 rounded border border-[#e5c68a] bg-[#fbf1dc] px-4 py-3 text-sm text-[#7a5412]">
        <strong>Invoices are not being issued yet.</strong> Add your business details on the server (Railway variables) first:{" "}
        {t.missing.map((m, i) => (
          <span key={m}>
            <code>{m}</code>
            {i < t.missing.length - 1 ? ", " : ""}
          </span>
        ))}
        . Until then members get a payment confirmation email without an invoice. Prices already include {t.ratePercent}% GST.
      </div>
    );
  }
  return (
    <>
      {t.discretionWarnings.length > 0 && (
        <div role="alert" className="mt-3 rounded border border-[#e5c68a] bg-[#fbf1dc] px-4 py-3 text-sm text-[#7a5412]">
          <strong>An invoice would give the service away.</strong> Invoices are PDFs that get opened on shared devices and forwarded, and these
          settings put words on them that the emails never use: {t.discretionWarnings.join("; ")}. Use your registered business name if it
          is neutral, and keep the description plain.
        </div>
      )}
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white px-4 py-3 text-sm text-muted">
      <p>
        <strong className="text-ink">GST is included in every price</strong> at {t.ratePercent}% (SAC {t.sac}). Place of supply: {t.placeOfSupply}
        {t.placeOfSupply.toLowerCase() === t.sellerState.toLowerCase() ? ` — invoices show CGST ${t.ratePercent / 2}% + SGST ${t.ratePercent / 2}%.` : ` — invoices show IGST ${t.ratePercent}%.`}
      </p>
      {data.paidWithoutInvoice > 0 && (
        <button
          onClick={issueMissing}
          disabled={busy}
          className="rounded bg-ink px-4 py-1.5 text-sm font-medium text-canvas transition hover:bg-gold disabled:opacity-60"
        >
          {busy ? "Issuing..." : `Issue ${data.paidWithoutInvoice} missing ${data.paidWithoutInvoice === 1 ? "invoice" : "invoices"}`}
        </button>
      )}
      {message && <p className="w-full text-ink">{message}</p>}
    </div>
    </>
  );
}

// ---------------------------------------------------------------- overview

function Overview(props: {
  data: PaymentsSummary | null;
  failed: string | null;
  step: Granularity;
  setStep: (s: Granularity) => void;
  range: string;
  setRange: (r: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  haveQuery: boolean;
  go: (t: Tab, extra?: Record<string, string>) => void;
}) {
  const { data, failed, step, setStep, range, setRange, from, setFrom, to, setTo, haveQuery, go } = props;
  const STEPS: { value: Granularity; label: string }[] = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ];
  const buckets = data?.series[0].points.length ?? 0;

  return (
    <div>
      <div className="mt-5 flex flex-wrap items-end gap-4 rounded-lg border border-line bg-white p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wider text-muted">Group by</span>
          <div role="group" aria-label="Group by" className="flex overflow-hidden rounded border border-line">
            {STEPS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStep(s.value)}
                aria-pressed={step === s.value}
                className={`px-4 py-2 text-sm transition ${step === s.value ? "bg-ink text-canvas" : "hover:bg-[#faf9f6]"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Labelled label="Range">
          <select value={range} onChange={(e) => setRange(e.target.value)} className={field}>
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Labelled>
        {range === "custom" && (
          <>
            <Labelled label="From">
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={field} />
            </Labelled>
            <Labelled label="To">
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={field} />
            </Labelled>
          </>
        )}
        <span className="flex-1" />
        {data && <RegisterButton from={data.from} to={data.to} />}
      </div>

      {failed ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          {failed} If this is new, the server may need a restart.
        </p>
      ) : !haveQuery ? (
        <p className="mt-6 text-sm text-muted">Pick a start date to see a custom range.</p>
      ) : data === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">
            {bucketLabel(data.from, data.granularity)} to {bucketLabel(data.to, "day")} · {buckets} {step === "day" ? "days" : step === "week" ? "weeks" : "months"}
            {data.lastBucketPartial && " · the latest period is still in progress, so it reads low"}
          </p>

          <Attention data={data} go={go} />

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Revenue (incl. GST)" value={formatMoney(data.revenuePaise.value)} metric={data.revenuePaise} emphasis />
            <Kpi label="Revenue excl. GST" value={formatMoney(data.taxablePaise.value)} metric={data.taxablePaise} note="The value of the supply" />
            <Kpi label={`GST collected (${data.tax.ratePercent}%)`} value={formatMoney(data.gstPaise.value)} metric={data.gstPaise} note="Included in the price, due to the government" />
            <Kpi label="Paid orders" value={data.paidOrders.value.toLocaleString()} metric={data.paidOrders} />
            <Kpi label="Average order" value={data.paidOrders.value === 0 ? "—" : formatMoney(data.averageOrderPaise.value)} metric={data.averageOrderPaise} />
            <Kpi label="Credits sold" value={data.creditsSold.value.toLocaleString()} metric={data.creditsSold} />
            <Kpi
              label="Paying members"
              value={data.payingMembers.value.toLocaleString()}
              metric={data.payingMembers}
              note={data.repeatBuyers > 0 ? `${data.repeatBuyers} have bought on more than one day` : undefined}
            />
            <Kpi label="Checkouts started" value={data.startedOrders.value.toLocaleString()} metric={data.startedOrders} />
            <Kpi
              label="Conversion"
              value={`${data.conversionPercent.value}%`}
              metric={data.conversionPercent}
              note="Of started checkouts that have finished, how many were paid"
              points
            />
            <Outcomes data={data} go={go} />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {data.series.map((s) => (
              <TrendChart key={s.key} series={s} granularity={data.granularity} lastBucketPartial={data.lastBucketPartial} />
            ))}
            <section className={`${card} p-4`}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Sales by pack</h3>
              {data.byPack.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No paid orders in this range.</p>
              ) : (
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
                    <tr>
                      <th className="py-2 font-medium">Pack</th>
                      <th className="py-2 text-right font-medium">Orders</th>
                      <th className="py-2 text-right font-medium">Credits</th>
                      <th className="py-2 text-right font-medium">Revenue</th>
                      <th className="py-2 text-right font-medium">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byPack.map((p) => (
                      <tr key={p.packId} className="border-b border-line/60 last:border-b-0">
                        <td className="py-2 font-medium">{packName(p.packId)}</td>
                        <td className="py-2 text-right tabular-nums">{p.orders}</td>
                        <td className="py-2 text-right tabular-nums">{p.credits.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums">{formatMoney(p.revenuePaise)}</td>
                        <td className="py-2 text-right tabular-nums text-muted">
                          {data.revenuePaise.value === 0 ? "0" : Math.round((p.revenuePaise / data.revenuePaise.value) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <Economy data={data} go={go} />

          <p className="mt-6 text-xs leading-relaxed text-muted">
            All prices include GST, so revenue is what members paid; "excl. GST" is what is left after the tax in it. Revenue counts the day the payment was made. Refunds and chargebacks are handled in the Cashfree dashboard and are <strong>not</strong>{" "}
            subtracted here. "Abandoned" means a checkout was started more than an hour ago and never paid.
          </p>
        </>
      )}
    </div>
  );
}

/** The GST register for the range: one line per invoice, for filing returns. */
function RegisterButton({ from, to }: { from: string; to: string }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const csv = await api.downloadGstRegister(from, to);
      saveFile(new Blob([csv], { type: "text/csv" }), `privlee-gst-register-${from}-to-${to}.csv`);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={download}
      disabled={busy}
      title="One line per invoice issued in this range: number, date, taxable value, CGST, SGST, IGST and total. The download is noted in the audit log."
      className="rounded border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-gold disabled:opacity-60"
    >
      {busy ? "Preparing..." : "Download GST register (CSV)"}
    </button>
  );
}

function Kpi({
  label,
  value,
  metric,
  note,
  emphasis,
  points,
}: {
  label: string;
  value: string;
  metric: PaymentMetric;
  note?: string;
  emphasis?: boolean;
  /** The change is in percentage points, not percent. */
  points?: boolean;
}) {
  const c = change(metric);
  let text = c.text;
  if (points && metric.previous !== metric.value) {
    const d = metric.value - metric.previous;
    text = `${d > 0 ? "▲ +" : "▼ "}${d} pts`;
  }
  const tone = c.tone === "up" ? "text-[#25613c]" : c.tone === "down" ? "text-danger" : "text-muted";
  return (
    <div className={`${card} p-4 ${emphasis ? "md:col-span-1" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs">
        <span className={tone}>{text}</span> <span className="text-muted">vs the period before</span>
      </p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

/** How the checkouts that were started ended up. Each count opens those orders. */
function Outcomes({ data, go }: { data: PaymentsSummary; go: (t: Tab, extra?: Record<string, string>) => void }) {
  const rows = [
    { key: "PAID", label: "Paid", n: data.startedOrders.value - data.failedOrders - data.abandonedOrders - data.pendingOrders },
    { key: "PENDING", label: "Pending", n: data.pendingOrders },
    { key: "ABANDONED", label: "Abandoned", n: data.abandonedOrders },
    { key: "FAILED", label: "Failed", n: data.failedOrders },
  ];
  return (
    <div className={`${card} p-4`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">How checkouts ended</p>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between">
            <button onClick={() => go("orders", { status: r.key, from: data.from, to: data.to })} className="text-left hover:text-gold hover:underline">
              {r.label}
            </button>
            <span className="tabular-nums">{Math.max(0, r.n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Things a person must look at, whatever the range. Hidden entirely when there is nothing. */
function Attention({ data, go }: { data: PaymentsSummary; go: (t: Tab, extra?: Record<string, string>) => void }) {
  const a = data.attention;
  const items: { tone: "bad" | "warn"; text: React.ReactNode; to: Record<string, string> }[] = [];
  if (a.amountMismatches > 0) {
    items.push({
      tone: "bad",
      text: (
        <>
          <strong>
            {a.amountMismatches} {a.amountMismatches === 1 ? "order was" : "orders were"} paid for the wrong amount
          </strong>{" "}
          ({formatMoney(a.mismatchPaise)} in all). No credits were added. Money may have been taken: check each one in Cashfree and settle it by hand.
        </>
      ),
      to: { status: "MISMATCH" },
    });
  }
  if (a.stuckOrders > 0) {
    items.push({
      tone: "warn",
      text: (
        <>
          <strong>
            {a.stuckOrders} {a.stuckOrders === 1 ? "checkout has" : "checkouts have"} been open for over 15 minutes
          </strong>{" "}
          in the last day. Someone may have paid and left before we heard. "Check with Cashfree" settles them.
        </>
      ),
      to: { status: "STUCK" },
    });
  }
  if (a.failedToStart > 0) {
    items.push({
      tone: "warn",
      text: (
        <>
          <strong>
            {a.failedToStart} {a.failedToStart === 1 ? "checkout" : "checkouts"} could not be started with Cashfree
          </strong>{" "}
          in this range. Nothing was taken. If it keeps happening, check the keys and the Cashfree status.
        </>
      ),
      to: { status: "FAILED", from: data.from, to: data.to },
    });
  }
  if (items.length === 0) {
    return (
      <p className="mt-4 flex items-center gap-2 rounded border border-line bg-white px-4 py-3 text-sm text-muted">
        <span className="h-2 w-2 rounded-full bg-[#2f9e5b]" /> Nothing needs attention: no wrong-amount payments, no stuck checkouts.
      </p>
    );
  }
  return (
    <div className="mt-4 space-y-2" role="region" aria-label="Needs attention">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-danger">Needs attention</h2>
      {items.map((it, i) => (
        <div
          key={i}
          className={`flex flex-wrap items-center justify-between gap-3 rounded border px-4 py-3 text-sm ${
            it.tone === "bad" ? "border-danger/40 bg-[#fbe5e3]" : "border-[#e5c68a] bg-[#fbf1dc]"
          }`}
        >
          <p className="max-w-3xl">{it.text}</p>
          <button onClick={() => go("orders", it.to)} className="shrink-0 rounded bg-ink px-4 py-1.5 text-sm font-medium text-canvas transition hover:bg-gold">
            Review
          </button>
        </div>
      ))}
    </div>
  );
}

/** Where credits came from and where they went, from the ledger. */
function Economy({ data, go }: { data: PaymentsSummary; go: (t: Tab, extra?: Record<string, string>) => void }) {
  const e = data.economy;
  const gained = e.lines.filter((l) => l.credits > 0);
  const spent = e.lines.filter((l) => l.credits < 0);
  const gainedTotal = gained.reduce((n, l) => n + l.credits, 0);
  const spentTotal = spent.reduce((n, l) => n + l.credits, 0);

  function Table({ title, lines, total }: { title: string; lines: typeof e.lines; total: number }) {
    return (
      <section className={`${card} p-4`}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing in this range.</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <tbody>
              {lines.map((l) => (
                <tr key={l.reason} className="border-b border-line/60 last:border-b-0">
                  <td className="py-2">
                    <button onClick={() => go("ledger", { reason: l.reason, from: data.from, to: data.to })} className="hover:text-gold hover:underline">
                      {l.label}
                    </button>
                  </td>
                  <td className="py-2 text-right text-xs text-muted tabular-nums">{l.entries.toLocaleString()}×</td>
                  <td className="py-2 text-right tabular-nums">{Math.abs(l.credits).toLocaleString()}</td>
                </tr>
              ))}
              <tr className="border-t border-line font-semibold">
                <td className="py-2">Total</td>
                <td />
                <td className="py-2 text-right tabular-nums">{Math.abs(total).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        )}
      </section>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Credits</h2>
        <p className="text-sm text-muted">
          Held by members right now: <strong className="text-ink tabular-nums">{e.inCirculation.toLocaleString()}</strong>
        </p>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Table title="Credits given or bought" lines={gained} total={gainedTotal} />
        <Table title="Credits spent" lines={spent} total={spentTotal} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- orders

function OrdersTab({ initial, reloads, onChanged }: { initial: Record<string, string>; reloads: number; onChanged: () => void }) {
  const [, setParams] = useSearchParams();
  const [status, setStatus] = useState(initial.status ?? "");
  const [q, setQ] = useState(initial.q ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [applied, setApplied] = useState({ status: initial.status ?? "", q: initial.q ?? "", from: initial.from ?? "", to: initial.to ?? "" });
  const [page, setPage] = useState(0);
  const [data, setData] = useState<PaymentOrderPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState<string | null>(null);

  async function invoiceAction(orderId: string, what: "download" | "issue" | "email") {
    setInvoiceBusy(orderId);
    setNotice(null);
    try {
      if (what === "download") {
        const f = await api.downloadAdminInvoice(orderId);
        saveFile(f.blob, f.filename);
      } else if (what === "issue") {
        const n = await api.issueInvoice(orderId);
        setNotice(`Issued invoice ${n}.`);
        load();
        onChanged();
      } else {
        await api.emailInvoice(orderId);
        setNotice("The confirmation and invoice were emailed to the member.");
        load();
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setInvoiceBusy(null);
    }
  }

  const load = useCallback(() => {
    let current = true;
    setFailed(false);
    api
      .getPaymentOrders(applied, page)
      .then((d) => current && setData(d))
      .catch(() => {
        if (current) {
          setData({ total: 0, page, size: 25, rows: [] });
          setFailed(true);
        }
      });
    return () => {
      current = false;
    };
  }, [applied, page]);

  useEffect(load, [load, reloads]);

  function apply() {
    setPage(0);
    setApplied({ status, q: q.trim(), from, to });
    // Kept in the address, so a filtered list can be linked to and survives a reload.
    setParams({ tab: "orders", ...Object.fromEntries(Object.entries({ status, q: q.trim(), from, to }).filter(([, v]) => v)) }, { replace: true });
  }

  function clear() {
    setStatus("");
    setQ("");
    setFrom("");
    setTo("");
    setPage(0);
    setApplied({ status: "", q: "", from: "", to: "" });
    setParams({ tab: "orders" }, { replace: true });
  }

  async function recheck(orderId: string) {
    setChecking(orderId);
    setNotice(null);
    try {
      const r = await api.recheckPaymentOrder(orderId);
      setNotice(`${orderId}: ${r.message}`);
      load();
      onChanged();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not check that order.");
    } finally {
      setChecking(null);
    }
  }

  async function download() {
    setExporting(true);
    try {
      const csv = await api.exportPaymentOrders(applied);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `privlee-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function copy(orderId: string) {
    navigator.clipboard?.writeText(orderId).then(() => {
      setCopied(orderId);
      window.setTimeout(() => setCopied((c) => (c === orderId ? null : c)), 1500);
    });
  }

  const filtered = Boolean(applied.status || applied.q || applied.from || applied.to);

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="mt-5 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4"
      >
        <Labelled label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label="Search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order id, member, email" className={`${field} w-64`} />
        </Labelled>
        <Labelled label="From">
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={field} />
        </Labelled>
        <Labelled label="To">
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={field} />
        </Labelled>
        <button className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold">Apply</button>
        {filtered && (
          <button type="button" onClick={clear} className="py-2 text-sm text-gold hover:underline">
            Clear
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={download}
          disabled={exporting || !data || data.total === 0}
          className="rounded border border-line bg-white px-4 py-2 text-sm font-medium transition hover:border-gold disabled:opacity-50"
          title="Everything that matches the filters, up to 10,000 orders. The download is noted in the audit log."
        >
          {exporting ? "Preparing..." : "Download CSV"}
        </button>
      </form>

      {notice && (
        <p role="status" className="mt-3 rounded border border-line bg-white px-4 py-2.5 text-sm">
          {notice}
        </p>
      )}

      {data === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : data.rows.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          {failed ? "Could not load the orders. Is the server up to date?" : filtered ? "No orders match these filters." : "No orders yet. They appear here once someone starts buying credits."}
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[64rem] text-left text-sm">
              <thead className="border-b border-line bg-[#faf9f6] text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Order</th>
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Pack</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium">Credits</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Invoice</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.orderId} className="border-b border-line/60 align-top last:border-b-0">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted" title={`${r.createdAt} (UTC)`}>
                      {when(r.createdAt)}
                      {r.paidAt && <p className="text-xs">paid {when(r.paidAt)}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => copy(r.orderId)} title="Copy the order id" className="font-mono text-xs hover:text-gold">
                        {r.orderId.slice(0, 14)}…{copied === r.orderId && <span className="ml-1 text-[#25613c]">copied</span>}
                      </button>
                      {r.cashfreeOrderId && <p className="font-mono text-[10px] text-muted">cf {r.cashfreeOrderId}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <MemberCell member={r.member} />
                    </td>
                    <td className="px-4 py-2.5">{packName(r.packId)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className="font-medium">{r.currency === "INR" ? formatMoney(r.amountPaise) : `${r.amountPaise / 100} ${r.currency}`}</span>
                      {r.status === "PAID" && (
                        <p className="text-[11px] text-muted" title={`${formatMoney(r.taxablePaise)} + ${formatMoney(r.gstPaise)} GST`}>
                          incl. {formatMoney(r.gstPaise)} GST
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.credits.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <StatusChip row={r} />
                      {r.status === "FAILED" && r.failureReason === "AMOUNT_MISMATCH" && <p className="mt-1 max-w-[12rem] text-xs text-danger">Settle in Cashfree by hand.</p>}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.invoiceNumber ? (
                        <>
                          <p className="font-mono text-xs">{r.invoiceNumber}</p>
                          <p className="mt-1 flex gap-3 text-xs">
                            <button onClick={() => invoiceAction(r.orderId, "download")} disabled={invoiceBusy === r.orderId} className="text-gold hover:underline disabled:opacity-60">
                              Download PDF
                            </button>
                            <button
                              onClick={() => invoiceAction(r.orderId, "email")}
                              disabled={invoiceBusy === r.orderId}
                              title={r.invoiceEmailed ? "Send it to the member again" : "It was never emailed - send it now"}
                              className="text-muted hover:text-ink hover:underline disabled:opacity-60"
                            >
                              {r.invoiceEmailed ? "Email again" : "Email now"}
                            </button>
                          </p>
                        </>
                      ) : r.status === "PAID" ? (
                        <button
                          onClick={() => invoiceAction(r.orderId, "issue")}
                          disabled={invoiceBusy === r.orderId}
                          className="rounded border border-line bg-white px-3 py-1 text-xs font-medium transition hover:border-gold disabled:opacity-60"
                        >
                          {invoiceBusy === r.orderId ? "Issuing..." : "Issue invoice"}
                        </button>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {(r.status === "PENDING" || r.status === "ABANDONED") && (
                        <button
                          onClick={() => recheck(r.orderId)}
                          disabled={checking === r.orderId}
                          className="rounded border border-line bg-white px-3 py-1 text-xs font-medium transition hover:border-gold disabled:opacity-60"
                          title="Ask Cashfree whether this was paid. If it was, the credits are added."
                        >
                          {checking === r.orderId ? "Asking..." : "Check with Cashfree"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- credit ledger

function LedgerTab({ initial, reloads }: { initial: Record<string, string>; reloads: number }) {
  const [, setParams] = useSearchParams();
  const [reason, setReason] = useState(initial.reason ?? "");
  const [q, setQ] = useState(initial.q ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [applied, setApplied] = useState({ reason: initial.reason ?? "", q: initial.q ?? "", from: initial.from ?? "", to: initial.to ?? "" });
  const [page, setPage] = useState(0);
  const [data, setData] = useState<LedgerPage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    setFailed(false);
    api
      .getCreditLedger(applied, page)
      .then((d) => current && setData(d))
      .catch(() => {
        if (current) {
          setData({ total: 0, page, size: 25, rows: [] });
          setFailed(true);
        }
      });
    return () => {
      current = false;
    };
  }, [applied, page, reloads]);

  function apply() {
    setPage(0);
    setApplied({ reason, q: q.trim(), from, to });
    setParams({ tab: "ledger", ...Object.fromEntries(Object.entries({ reason, q: q.trim(), from, to }).filter(([, v]) => v)) }, { replace: true });
  }

  function clear() {
    setReason("");
    setQ("");
    setFrom("");
    setTo("");
    setPage(0);
    setApplied({ reason: "", q: "", from: "", to: "" });
    setParams({ tab: "ledger" }, { replace: true });
  }

  const filtered = Boolean(applied.reason || applied.q || applied.from || applied.to);

  return (
    <div>
      <p className="mt-4 text-sm text-muted">
        Every change to every member's credits, newest first: what they bought or were given, and what they spent it on.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4"
      >
        <Labelled label="Kind">
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={field}>
            {REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled label="Search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Member, email, order id" className={`${field} w-64`} />
        </Labelled>
        <Labelled label="From">
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={field} />
        </Labelled>
        <Labelled label="To">
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={field} />
        </Labelled>
        <button className="rounded bg-ink px-5 py-2 text-sm font-medium text-canvas transition hover:bg-gold">Apply</button>
        {filtered && (
          <button type="button" onClick={clear} className="py-2 text-sm text-gold hover:underline">
            Clear
          </button>
        )}
      </form>

      {data === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : data.rows.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          {failed ? "Could not load the ledger. Is the server up to date?" : filtered ? "Nothing matches these filters." : "No credit activity yet."}
        </p>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line bg-[#faf9f6] text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">What</th>
                  <th className="px-4 py-2.5 text-right font-medium">Credits</th>
                  <th className="px-4 py-2.5 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 align-top last:border-b-0">
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted" title={`${r.createdAt} (UTC)`}>
                      {when(r.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <MemberCell member={r.member} />
                    </td>
                    <td className="px-4 py-2.5">{r.label}</td>
                    <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${r.credits > 0 ? "text-[#25613c]" : "text-ink"}`}>
                      {r.credits > 0 ? "+" : "−"}
                      {Math.abs(r.credits).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted">{r.reference ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} size={data.size} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}
