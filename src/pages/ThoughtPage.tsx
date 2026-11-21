import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Thought } from "../lib/types";
import ThoughtCard from "../components/ThoughtCard";
import ThoughtReplies from "../components/ThoughtReplies";
import { useLikeAllowance } from "../lib/useLikeAllowance";

/** One thought with its comments open: where a notification about it lands. */
export default function ThoughtPage() {
  const { id } = useParams();
  const allowance = useLikeAllowance();
  const navigate = useNavigate();
  const [thought, setThought] = useState<Thought | null>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getThought(id).then(setThought).catch(() => setGone(true));
  }, [id]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/thoughts" className="mb-5 inline-block text-sm text-muted hover:text-ink">
        ← Thread · all thoughts
      </Link>
      {gone ? (
        <div className="py-16 text-center">
          <p className="font-display text-3xl">This thought isn't here anymore</p>
          <p className="mt-3 text-sm text-muted">It may have expired, or been removed.</p>
        </div>
      ) : thought === null ? (
        <p className="py-10 text-center text-sm text-muted">Loading…</p>
      ) : (
        <ThoughtCard thought={thought} allowance={allowance} thread onChange={setThought} onDeleted={() => navigate("/thoughts", { replace: true })}>
          <ThoughtReplies thought={thought} onChange={setThought} allowance={allowance} />
        </ThoughtCard>
      )}
    </div>
  );
}
