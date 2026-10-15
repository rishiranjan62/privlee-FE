import PhotoAccessManager from "./PhotoAccessManager";

/** The private album's version of the access list: asks waiting on a decision, and who is already let in. */
export default function PrivateAccessManager() {
  return <PhotoAccessManager kind="private" />;
}
