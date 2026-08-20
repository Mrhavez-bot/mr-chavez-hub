import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  configApi, studentsApi, rewardsApi, transactionsApi,
  attendanceApi, tasksApi, scoresApi, projectsApi
} from "../lib/api";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

const EMPTY = {
  config: null, students: [], rewards: [], purchases: [], transactions: [],
  attendance: [], tasks: [], taskResults: [], scores: [],
  projects: [], criteria: [], projectResults: []
};

export function DataProvider({ children }) {
  const { session } = useAuth();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);
    const [
      config, students, rewards, purchases, transactions,
      attendance, tasks, taskResults, scores, projects, criteria, projectResults
    ] = await Promise.all([
      configApi.get(), studentsApi.list(), rewardsApi.list(), rewardsApi.purchases(), transactionsApi.list(),
      attendanceApi.list(), tasksApi.list(), tasksApi.results(), scoresApi.list(),
      projectsApi.list(), projectsApi.criteria(), projectsApi.results()
    ]);
    setData({
      config, students, rewards, purchases, transactions,
      attendance, tasks, taskResults, scores, projects, criteria, projectResults
    });
    setLoading(false);
  }, [session]);

  useEffect(() => { reload(); }, [reload]);

  return <DataContext.Provider value={{ ...data, loading, reload }}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
