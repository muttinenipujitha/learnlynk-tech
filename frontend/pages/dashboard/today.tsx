// frontend/pages/dashboard/today.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Task = {
  id: string;
  type: string;
  application_id: string;
  due_at: string;
  status: string;
};

export default function TodayTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadTasks() {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        0,
        0
      );

      const { data, error } = await supabase
        .from("tasks")
        .select("id, type, application_id, due_at, status")
        .gte("due_at", startOfDay.toISOString())
        .lt("due_at", endOfDay.toISOString())
        .neq("status", "completed")
        .order("due_at", { ascending: true });

      if (error) {
        throw error;
      }

      setTasks((data as Task[]) ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleMarkComplete(id: string) {
    try {
      setUpdatingId(id);
      const { error } = await supabase
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", id);

      if (error) {
        throw error;
      }

      // Refresh list
      await loadTasks();
    } catch (err: any) {
      setError(err?.message ?? "Failed to update task");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ padding: "1.5rem" }}>
      <h1>Tasks Due Today</h1>

      {loading && <p>Loading tasks...</p>}
      {error && !loading && (
        <p style={{ color: "red" }}>Error: {error}</p>
      )}

      {!loading && !error && tasks.length === 0 && (
        <p>No tasks due today 🎉</p>
      )}

      {!loading && !error && tasks.length > 0 && (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "1rem",
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Type
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Application ID
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Due At
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Status
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const isUpdating = updatingId === task.id;

              return (
                <tr key={task.id}>
                  <td style={{ padding: "0.5rem 0.25rem" }}>
                    {task.type}
                  </td>
                  <td style={{ padding: "0.5rem 0.25rem" }}>
                    {task.application_id}
                  </td>
                  <td style={{ padding: "0.5rem 0.25rem" }}>
                    {new Date(task.due_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.5rem 0.25rem" }}>
                    {task.status}
                  </td>
                  <td style={{ padding: "0.5rem 0.25rem" }}>
                    <button
                      onClick={() => handleMarkComplete(task.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Updating..." : "Mark Complete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
