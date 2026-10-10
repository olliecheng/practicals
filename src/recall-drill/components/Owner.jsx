import Avatar from "./Avatar";

// "by <name>" with the owner's avatar; owner = {id, name, image} from the API
export default function Owner({ owner }) {
  if (!owner) return null;
  return (
    <span className="byline">
      <Avatar user={owner} size="sm" />
      by {owner.name}
    </span>
  );
}
