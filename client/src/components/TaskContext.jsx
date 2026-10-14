import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { TaskContext } from "../utils/taskContext";
export function TaskProvider({ children }) {
  const [task, setTask] = useState(null);
  useEffect(() => {
    if (!task) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [task]);
  return (
    <TaskContext.Provider value={{ task, setTask }}>
      {children}
    </TaskContext.Provider>
  );
}

TaskProvider.propTypes = { children: PropTypes.node.isRequired };
