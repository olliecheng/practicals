// Drag and drop shows a line where the dragged row will land instead of moving the other rows.
// The row the dragged one is over, taken from the collision list (the `over` of the drag events can lag a render behind it):
// {id, rect}, or null
export const overOf = ({ collisions }) => {
  const c = collisions?.[0];
  const rect = c?.data?.droppableContainer?.rect?.current;
  return rect ? { id: c.id, rect } : null;
};

// True when the dragged row's centre is above the centre of the row it is over (so it lands before that row)
export const isBefore = (active, over) => {
  const r = active.rect.current.translated;
  return !r || r.top + r.height / 2 < over.rect.top + over.rect.height / 2;
};

// Sortable strategy that never moves the rows
export const noShift = () => null;
