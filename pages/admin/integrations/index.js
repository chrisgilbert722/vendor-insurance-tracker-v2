import { useEffect, useState } from "react";
import { useOrg } from "../../../context/OrgContext";

export default function IntegrationsPage() {
  const { activeOrgId } = useOrg();
  const [keys, setKeys] = useState([]);
  const [hooks, setHooks] = useState([]);

  useEffect(() => {
    if (!activeOrgId) return;
    fetch(`/api/admin/integrations?orgId=${activeOrgId}`)
      .then(r => r.json())
      .then(j => {
        setKeys(j.keys || []);
        setHooks(j.hooks || []);
      });
  }, [activeOrgId]);

  return (
    <div style={{ padding: 32 }}>
      <h1>Integrations</h1>

      <section>
        <h3>API Keys</h3>
        {/* list + create */}
      </section>

      <section>
        <h3>Webhooks</h3>
        {/* list + add + test */}
      </section>
    </div>
  );
}
