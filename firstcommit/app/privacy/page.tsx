import Link from "next/link";

export default function PrivacyPage() {
  return <main className="policy-page">
    <section className="policy-hero"><span className="eyebrow">PRIVACY & DATA</span><h1>Your learning data stays in your control.</h1><p>ShikshaMesh uses only the data required to provide course-grounded learning, collaboration, and assessment.</p></section>
    <section className="policy-grid">
      <article><h2>What we process</h2><p>Account identity, authorised class membership, uploaded course material, learning attempts, and optional live-room activity are processed to operate the learning workspace.</p></article>
      <article><h2>AI boundaries</h2><p>Course-grounded AI retrieves content only within your authorised institution and class. External research is labelled separately and is policy-gated.</p></article>
      <article><h2>Optional model research</h2><p>Training-data consent is off by default. If enabled, only pseudonymous quiz-attempt data may be exported for approved model evaluation. Names, emails, voice, chat, and notes are excluded.</p></article>
      <article><h2>Retention and deletion</h2><p>Learning records are retained only while your account and class access are active, subject to your institution’s policy. You can withdraw research consent immediately and submit an account-deletion request from Account settings.</p></article>
      <article><h2>Security</h2><p>Authentication uses Amazon Cognito. Production deployments use HTTPS, least-privilege IAM roles, encrypted AWS storage, and secrets managed outside source control.</p></article>
      <article><h2>Your choices</h2><p>Manage password and consent in <Link href="/account">Account settings</Link>. For a deletion request, sign in and use the danger zone there.</p></article>
    </section>
  </main>;
}
