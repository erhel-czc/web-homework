# Kanban Exercises (Beginner Guide)

This project is a simple 3-column kanban board (`TO-DO`, `DOING`, `DONE`).

## Question 1: Add 5 Buttons on Each Item

### Exercise statement
When a new item is created, it should include 5 action buttons:

1. Move up
2. Move down
3. Move left
4. Move right
5. Delete

Rules:

1. `Left` should do nothing when the item is already in the left-most panel (`TO-DO`).
2. `Right` should do nothing when the item is already in the right-most panel (`DONE`).
3. No cyclic behavior (`DONE -> TO-DO` is not allowed, `TO-DO -> DONE` is not allowed directly by wrap-around).

### Hints: HTML

1. Use real `<button type="button">` elements for actions.
2. Optional but good practice: use `title` or `aria-label` on buttons (for accessibility/tooltips).

### Hints: CSS

1. Let text take available space:
   - `.item_text { flex: 1; min-width: 0; }`
2. Give small fixed button sizes for consistency.
3. Keep wrapping support on long text:
   - `white-space: normal`
   - `overflow-wrap: anywhere`

### Hints: JavaScript

1. Build items with a helper function (example: `make_item(text)`).
2. Create small helper functions:
   - `move_up(item)`
   - `move_down(item)`
   - `move_horizontal(item, direction)` where direction is `-1` or `+1`
   - `delete_item(item)`
3. For vertical move:
   - use `previousElementSibling` and `nextElementSibling`
   - use `insertBefore(...)` to reorder in the same parent
4. For delete:
   - `item.remove()`

---

## Question 2: Drag and Drop + Drop-to-Delete

### Exercise statement
Implement drag-and-drop in vanilla JS so items can:

1. Reorder inside the same panel.
2. Move to another panel.

Extra rule:

1. While dragging an item, the `ADD TO-DO` button becomes red and text changes to `DELETE TO-DO`.
2. If the dragged item is dropped on that button, the item is deleted.

### Hints: HTML

1. Items must become draggable in JS:
   - `item.draggable = true`

### Hints: CSS

1. Add visual state for dragged item:
   - `.item.dragging { opacity: ... }`
   - optional cursor change (`grab` / `grabbing`)
2. Add red button mode class:
   - `#add_button.delete_mode { background-color: ... }`
3. Add stronger style when pointer is over delete target:
   - `#add_button.delete_target { ... }`

### Hints: JavaScript

1. Keep one state variable:
   - `let dragged_item = null;`
2. Create helper:
   - `set_delete_mode(enabled)` to toggle class/text on add button
3. Use events :
   - `dragstart`
   - `dragend`
   - `dragover` (with `event.preventDefault()` ,required to allow drop)
   - `dragleave`
   - `drop`
4. Useful helper pattern:
   - `get_insert_before_item(list, mouseY)` using `getBoundingClientRect()` and item midpoints
5. In that helper, query only non-dragged cards:
   - `list.querySelectorAll(".item:not(.dragging)")`
6. Register drag handlers for both:
   - newly created items
   - any existing items present at load (just in case)

### Common beginner pitfalls

1. Forgetting `event.preventDefault()` on `dragover` (drop will not work).
2. Using `event.target` directly for insertion logic without considering nested elements.

### Note on mobile

Native HTML5 drag-and-drop is mainly desktop-focused. Touch devices often need a pointer/touch-based custom implementation.
