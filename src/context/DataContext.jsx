import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
// ...imports de api igual que antes
import { useAuth } from "./AuthContext";

export function DataProvider({ children }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null; // string estable, no cambia con el refresh
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!userId) {
      setData(EMPTY);
      hasLoadedRef.current = false;
      setLoading(false);
      return;
    }
    // Spinner solo en la primera carga; las recargas manuales no tumban la UI
    if (!silent && !hasLoadedRef.current) setLoading(true);

    const [
      config, students, rewards, purchases, transactions,
      attendance, tasks, taskResults, scores, projects, criteria, projectResults,
      announcements, surveys, surveyVotes, languagePortfolio
    ] = await Promise.all([
      configApi.get(), studentsApi.list(), rewardsApi.list(), rewardsApi.purchases(), transactionsApi.list(),
      attendanceApi.list(), tasksApi.list(), tasksApi.results(), scoresApi.list(),
      projectsApi.list(), projectsApi.criteria(), projectsApi.results(),
      announcementsApi.list(), surveysApi.list(), surveysApi.votes(), languagePortfolioApi.list()
    ]);

    setData({
      config, students, rewards, purchases, transactions,
      attendance, tasks, taskResults, scores, projects, criteria, projectResults,
      announcements, surveys, surveyVotes, languagePortfolio
    });
    hasLoadedRef.current = true;
    setLoading(false);
  }, [userId]); // <- antes era [session]

  useEffect(() => { reload(); }, [reload]);

  return <DataContext.Provider value={{ ...data, loading, reload }}>{children}</DataContext.Provider>;
}
