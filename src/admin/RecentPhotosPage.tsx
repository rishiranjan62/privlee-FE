import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminPhoto } from "../lib/types";

export default function RecentPhotosPage() {
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null);

  useEffect(() => {
    api.getRecentUploads().then(setPhotos).catch(() => setPhotos([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Recent uploads</h1>
      <p className="mt-1 text-sm text-muted">
        A spot-check of the newest photos, shown as the real image. Opening this page is recorded in
        the audit log.
      </p>

      {photos === null ? (
        <p className="py-10 text-center text-muted">Loading...</p>
      ) : photos.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-white/60 px-6 py-12 text-center text-muted">
          No uploads yet.
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((p) => (
            <li key={p.photoId} className="overflow-hidden rounded-lg border border-line bg-white">
              <img src={p.url} alt="" className="aspect-square w-full object-cover" />
              <div className="p-2 text-xs">
                <Link to={`/admin/users/${p.ownerId}`} className="font-medium text-gold hover:underline">
                  {p.ownerPseudonym}
                </Link>
                <p className="text-muted">{new Date(p.uploadedAt).toLocaleString()}</p>
                {p.ownerState !== "ACTIVE" && <p className="font-semibold uppercase text-danger">{p.ownerState}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
