document.addEventListener(
  "DOMContentLoaded",
  () => {
    const add_button = document.getElementById("add_button");
    const text_input = document.getElementById("text_input");
    const todo_list = document.getElementById("todo_list");

    const add_todo = () => {
      let input = text_input.value.trim();
      if ( !(input === "") ){
        text_input.value = "";
        let new_todo = document.createElement("div");
        new_todo.classList.add("item");
        new_todo.textContent = input;
        todo_list.append(new_todo);
      }
    };

    add_button.addEventListener(
      "click",
      add_todo
    );

    text_input.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          add_todo();
        }
      }
    );
  }
)
