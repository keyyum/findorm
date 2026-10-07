import { useState } from "react";
import { Link } from "react-router-dom";
import { peso, plural } from "../lib/format";
import { ImageIcon, MapPinIcon } from "./Icons";
import { FullBadge } from "./ui";

const genderLabel = { Male: "Male only", Female: "Female only", Any: "Mixed" };

/** Search result card (ListingSummary from the API). */
export default function ListingCard({ listing, className = "", style }) {
  const l = listing;
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Extract cover photo URL safely whether backend uses 'photos' array or single 'photo'
  const firstPhoto = Array.isArray(l.photos) && l.photos.length > 0 ? l.photos[0] : null;
  const imageUrl = (typeof firstPhoto === "object" ? firstPhoto?.url : firstPhoto) || l.photo;

  return (
    <Link
      to={`/listings/${l._id}`}
      style={style}
      className={`lift group flex flex-col rounded-[14px] border border-line bg-white ${className}`}
    >
      <div className="relative h-[196px] overflow-hidden rounded-t-[13px] bg-haze">
        {imageUrl && !failed ? (
          <img src={imageUrl} alt={l.name || ""} loading="lazy" data-loaded={loaded} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="lift-img h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#7f9cbc]">
            <ImageIcon size={32} />
            <span className="text-xs font-medium">No photo yet</span>
          </div>
        )}
        <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-navy">{l.propertyType}</span>
        {l.isFull && <FullBadge className="absolute top-3 right-3 shadow-sm" />}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="truncate text-base font-semibold tracking-tight group-hover:underline">{l.name}</h3>
        <p className="flex items-center gap-1.5 text-[13px] text-steel">
          <MapPinIcon size={15} />
          {l.city}
          <span aria-hidden="true">·</span>
          {genderLabel[l.genderCategory] || l.genderCategory}
        </p>
        <div className="mt-auto flex items-end justify-between pt-2">
          <p>
            <span className="text-lg font-semibold tabular-nums">{peso(l.monthlyRent)}</span>
            <span className="text-[13px] text-steel"> / month</span>
          </p>
          <p className={`text-[13px] font-medium tabular-nums ${l.isFull ? "text-warning" : "text-success"}`}>
            {l.isFull ? "No slots left" : `${l.availableSlots} of ${plural(l.capacity, "slot")} left`}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-white" aria-hidden="true">
      <span className="skel block h-[196px]" />
      <div className="flex flex-col gap-3 p-4">
        <span className="skel block h-4 w-3/4 rounded" />
        <span className="skel block h-3 w-1/2 rounded" />
        <span className="skel mt-3 block h-5 w-1/3 rounded" />
      </div>
    </div>
  );
}