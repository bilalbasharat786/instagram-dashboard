import Layout from "../components/Layout";

const Settings = () => {
  return (
    <Layout title="Settings" subtitle="Security aur production configuration checklist.">
      <section className="panel">
        <h2>Security Guardrails</h2>
        <ul className="check-list">
          <li>Dashboard passwords bcrypt se hash hotay hain.</li>
          <li>Instagram passwords database mein store nahi hotay.</li>
          <li>Official OAuth tokens encrypted fields mein save hotay hain.</li>
          <li>JWT cookie HTTP-only mode mein set hoti hai.</li>
          <li>Follow action user manually Instagram par confirm karta hai.</li>
          <li>Rate-limit bypass, fake device, proxy rotation, CAPTCHA bypass ya spoofing implement nahi hai.</li>
        </ul>
      </section>
    </Layout>
  );
};

export default Settings;
