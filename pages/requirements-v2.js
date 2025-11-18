// pages/requirements-v2.js
import { useEffect, useState } from "react";
import { useOrg } from "../context/OrgContext";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export default function RequirementsV2Page() {
  const { activeOrgId } = useOrg();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  // Load groups
  async function loadGroups() {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/requirements-v2?orgId=${activeOrgId}`);
      const data = await res.json();

      if (!data.ok) throw new Error(data.error);
      setGroups(data.groups);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, [activeOrgId]);

  // Create group
  async function createGroup() {
    if (!newGroupName.trim()) return;

    const res = await fetch(`/api/requirements-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newGroupName,
        org_id: activeOrgId,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      setNewGroupName("");
      loadGroups();
    } else {
      alert(data.error);
    }
  }

  // Delete group
  async function deleteGroup(id) {
    if (!confirm("Delete this group?")) return;

    const res = await fetch(`/api/requirements-v2/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (data.ok) loadGroups();
    else alert(data.error);
  }

  // Rename group
  async function renameGroup(id, newName) {
    const res = await fetch(`/api/requirements-v2/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    const data = await res.json();
    if (data.ok) loadGroups();
    else alert(data.error);
  }

  // Drag + drop reorder
  async function moveGroup(dragIndex, hoverIndex) {
    const updated = [...groups];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, removed);

    setGroups(updated);

    // Save new order
    for (let i = 0; i < updated.length; i++) {
      await fetch(`/api/requirements-v2/${updated[i].id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_index: i }),
      });
    }
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: "30px 40px", maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>
          Requirements Engine V2
        </h1>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {loading && <p>Loading…</p>}

        {/* Create new group */}
        <div style={{ marginBottom: 30 }}>
          <input
            placeholder="New Group Name"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            style={{
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 8,
              marginRight: 10,
            }}
          />
          <button
            onClick={createGroup}
            style={{
              padding: "8px 14px",
              background: "#0f172a",
              color: "white",
              borderRadius: 8,
              border: "none",
            }}
          >
            + Add Group
          </button>
        </div>

        {/* List groups */}
        {groups.map((g, index) => (
          <GroupRow
            key={g.id}
            group={g}
            index={index}
            moveGroup={moveGroup}
            onDelete={() => deleteGroup(g.id)}
            onRename={(name) => renameGroup(g.id, name)}
          />
        ))}
      </div>
    </DndProvider>
  );
}

// Draggable group row
function GroupRow({ group, index, moveGroup, onDelete, onRename }) {
  const [{ isDragging }, dragRef] = useDrag({
    type: "GROUP",
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: "GROUP",
    hover(item) {
      if (item.index !== index) {
        moveGroup(item.index, index);
        item.index = index;
      }
    },
  });

  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(group.name);

  return (
    <div
      ref={(node) => dragRef(dropRef(node))}
      style={{
        opacity: isDragging ? 0.5 : 1,
        marginBottom: 12,
        padding: 15,
        background: "#f9fafb",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
      }}
    >
      {/* Edit Mode */}
      {editing ? (
        <div>
          <input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            style={{ padding: 8, width: "70%" }}
          />
          <button
            onClick={() => {
              setEditing(false);
              onRename(tempName);
            }}
            style={{
              marginLeft: 10,
              padding: "6px 12px",
              background: "#0f172a",
              color: "white",
              borderRadius: 6,
            }}
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{ marginLeft: 10 }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600 }}>{group.name}</span>

          <div>
            <button
              onClick={() => setEditing(true)}
              style={{ marginRight: 10 }}
            >
              Edit
            </button>
            <button onClick={onDelete} style={{ color: "red" }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
