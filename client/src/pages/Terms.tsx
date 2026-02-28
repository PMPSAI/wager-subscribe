import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Zap, ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    id: "nature",
    title: "1. Nature of the Service — Not a Financial Product",
    content: `IncentivPay is a subscription-based software platform that provides performance incentive tracking as a feature of its subscription plans. IncentivPay is NOT a financial product, investment product, insurance product, securities offering, money-services business, gambling service, sweepstakes, lottery, or prize promotion of any kind.

Rewards issued through IncentivPay are exclusively subscription credits applied to future IncentivPay billing cycles. Subscription credits have no cash value, cannot be redeemed for cash or any monetary equivalent, are non-transferable, and expire upon cancellation of the subscriber's account. No money is paid out to subscribers under any circumstances.

IncentivPay does not hold, transmit, or manage subscriber funds. All payment processing is performed by Stripe, Inc., a licensed payment processor. IncentivPay is not a money transmitter and does not require a money-transmitter license.`,
  },
  {
    id: "gambling",
    title: "2. Not a Gambling Service",
    content: `IncentivPay's performance incentive feature does not constitute gambling under applicable U.S. federal or state law. Specifically:

(a) Subscribers do not wager money against IncentivPay or against other subscribers. The subscription fee is paid for access to the IncentivPay software platform, not as consideration for a chance to win a prize.

(b) Rewards are subscription credits — a reduction in future subscription fees — not prizes, cash, or items of value.

(c) IncentivPay does not operate under any gambling license and is not regulated by any state gaming commission.

Subscribers who reside in jurisdictions with laws that may affect performance incentive programs are solely responsible for determining the legality of using IncentivPay in their jurisdiction. IncentivPay makes no representation that its services are appropriate or available in all jurisdictions.`,
  },
  {
    id: "conditions",
    title: "3. Incentive Conditions and Outcomes",
    content: `Incentive conditions are real-world events tracked against publicly available third-party data sources (e.g., financial market data, sports results, economic indicators). IncentivPay does not control, influence, or predict the outcome of any incentive condition.

Condition outcomes are determined solely by IncentivPay's automated resolver process, which evaluates publicly available data at the time of resolution. Outcome determinations are final and binding. IncentivPay reserves the right to correct manifest errors in outcome determinations.

The 30-day tracking window begins on the date the subscriber activates an incentive condition and ends at 11:59 PM UTC on the 30th calendar day thereafter. Conditions that are not achieved within the tracking window are marked as "Not Achieved" and no subscription credit is issued.

Past condition outcomes are not indicative of future results. IncentivPay does not guarantee that any condition will be achieved.`,
  },
  {
    id: "credits",
    title: "4. Subscription Credits",
    content: `Subscription credits are applied to the subscriber's IncentivPay account upon achievement of an incentive condition and are used to offset future subscription billing cycles. Credits are applied automatically at the next billing date.

Subscription credits: (a) have no cash value; (b) cannot be transferred to another account; (c) cannot be combined with promotional discounts unless explicitly stated; (d) expire immediately upon account cancellation; (e) are subject to a maximum cap of 24 months of subscription credit per account per calendar year.

IncentivPay reserves the right to modify the subscription credit program at any time with 30 days' prior notice to subscribers.`,
  },
  {
    id: "ftc",
    title: "5. FTC Compliance — Material Disclosures",
    content: `In accordance with Federal Trade Commission guidelines (16 C.F.R. Part 255), IncentivPay discloses the following:

(a) Subscription credits are the only form of reward issued. No cash, merchandise, or other items of value are awarded.

(b) The probability of achieving any given incentive condition depends entirely on real-world events outside IncentivPay's control. IncentivPay does not represent or imply that any condition is likely to be achieved.

(c) Any testimonials or case studies presented on the IncentivPay platform reflect individual experiences and are not representative of typical outcomes.

(d) IncentivPay may receive compensation from third-party data providers whose data is used to track incentive conditions.`,
  },
  {
    id: "udaap",
    title: "6. UDAAP Compliance",
    content: `IncentivPay is committed to compliance with the Consumer Financial Protection Bureau's Unfair, Deceptive, or Abusive Acts or Practices (UDAAP) standards, as applicable to non-bank financial service providers.

IncentivPay does not engage in deceptive marketing practices. All material terms of the subscription and incentive program are disclosed prominently before purchase. Subscription fees, incentive conditions, reward values, and credit terms are clearly stated on the Plans page and in these Terms of Service.

Subscribers may cancel their subscription at any time from their account settings. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial billing periods.`,
  },
  {
    id: "efta",
    title: "7. Electronic Fund Transfer Act (EFTA) Notice",
    content: `IncentivPay does not initiate electronic fund transfers on behalf of subscribers beyond the recurring subscription billing managed by Stripe, Inc. Stripe's terms of service govern all payment processing. Subscribers authorize recurring charges by completing the Stripe Checkout process.

Subscribers may cancel recurring charges at any time by cancelling their subscription through the IncentivPay account settings or by contacting Stripe support. IncentivPay does not store payment card information; all card data is managed by Stripe in accordance with PCI DSS standards.`,
  },
  {
    id: "privacy",
    title: "8. Data and Privacy",
    content: `IncentivPay collects subscriber account information (name, email address, authentication identifiers) and transaction data (Stripe customer ID, subscription ID, incentive condition selections) for the purpose of operating the platform and delivering subscription credits.

IncentivPay does not sell subscriber personal information to third parties. Subscriber data is processed in accordance with IncentivPay's Privacy Policy. By using IncentivPay, subscribers consent to the collection and processing of their data as described in the Privacy Policy.`,
  },
  {
    id: "limitation",
    title: "9. Limitation of Liability",
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, INCENTIVPAY'S TOTAL LIABILITY TO ANY SUBSCRIBER FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE INCENTIVPAY SERVICE SHALL NOT EXCEED THE TOTAL SUBSCRIPTION FEES PAID BY THAT SUBSCRIBER IN THE THREE (3) MONTHS PRECEDING THE CLAIM.

INCENTIVPAY IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR LOSS OF GOODWILL, ARISING OUT OF OR IN CONNECTION WITH THESE TERMS OR THE USE OF THE INCENTIVPAY SERVICE.`,
  },
  {
    id: "governing",
    title: "10. Governing Law and Dispute Resolution",
    content: `These Terms of Service are governed by the laws of the State of Delaware, without regard to its conflict-of-law provisions. Any dispute arising out of or relating to these Terms shall be resolved by binding arbitration administered by the American Arbitration Association under its Consumer Arbitration Rules, except that either party may seek injunctive relief in a court of competent jurisdiction.

By using IncentivPay, subscribers waive the right to participate in a class action lawsuit or class-wide arbitration.`,
  },
  {
    id: "changes",
    title: "11. Changes to Terms",
    content: `IncentivPay reserves the right to modify these Terms of Service at any time. Subscribers will be notified of material changes via email at least 30 days before the changes take effect. Continued use of the IncentivPay service after the effective date of any changes constitutes acceptance of the revised Terms.`,
  },
];

export default function Terms() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-bold text-foreground text-lg">IncentivPay</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1.5">
            <ArrowLeft size={14} /> Back
          </Button>
        </div>
      </header>

      <div className="container max-w-3xl mx-auto py-16 px-4">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-foreground mb-3">Terms of Service &amp; Legal Disclosures</h1>
          <p className="text-muted-foreground">
            Effective Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900">
            <strong>Important:</strong> Please read these Terms carefully before subscribing. By completing a subscription purchase, you acknowledge that you have read, understood, and agree to these Terms, including the disclosures regarding the nature of IncentivPay rewards as subscription credits with no cash value.
          </div>
        </div>

        {/* Table of Contents */}
        <nav className="mb-10 bg-muted/40 border border-border rounded-xl p-5">
          <p className="font-semibold text-foreground text-sm mb-3">Table of Contents</p>
          <ol className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-primary hover:underline">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="text-xl font-bold text-foreground mb-3">{s.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                {s.content.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-16 border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Questions about these Terms? Contact us at <a href="mailto:legal@incentivpay.com" className="text-primary hover:underline">legal@incentivpay.com</a>
          </p>
          <Button onClick={() => navigate("/plans")} className="gap-2">
            View Plans <ArrowLeft size={14} className="rotate-180" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-10">
        <div className="container max-w-5xl mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} IncentivPay. All rights reserved. IncentivPay is not a financial product, gambling service, or money-services business. Rewards are subscription credits only.</p>
        </div>
      </footer>
    </div>
  );
}
