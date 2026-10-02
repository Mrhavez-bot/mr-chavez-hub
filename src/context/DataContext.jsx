import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  configApi, studentsApi, rewardsApi, transactionsApi,
  attendanceApi, tasksApi, scoresApi, projectsApi,
  announcementsApi, surveysApi, languagePortfolioApi
} from "../lib/api";
import { useAuth } from "./AuthContext";

const DataContext = createContext(null);

const EMPTY = {
  config: null, students: [], rewards: [], purchases: [], transactions: [],
  attendance: [], tasks: [], taskResults: [], scores: [],
  projects: [], criteria: [], projectResults: [],
  announcements: [], surveys: [], surveyVotes: [], languagePortfolio: []
};

export function DataProvider({ children }) {
  const { session } = useAuth();
  // Keyed off the user id (stable across Supabase's silent token refreshes)
  // rather than the whole session object, so switching browser tabs/windows
  // no longer triggers a full reload of every table in the app.
  const userId = session?.user?.id || null;
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) { setData(EMPTY); setLoading(false); return; }
    setLoading(true);
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
    setLoading(false);
  }, [userId]);

  // Granular refreshers: re-fetch only the table(s) a screen just changed,
  // instead of all ~16 queries. These never touch the global "loading" flag,
  // so there's no full-screen flash — just that one section updating.
  const refreshAttendance = useCallback(async () => {
    const attendance = await attendanceApi.list();
    setData((d) => ({ ...d, attendance }));
  }, []);
  const refreshTasks = useCallback(async () => {
    const [tasks, taskResults] = await Promise.all([tasksApi.list(), tasksApi.results()]);
    setData((d) => ({ ...d, tasks, taskResults }));
  }, []);
  const refreshScores = useCallback(async () => {
    const scores = await scoresApi.list();
    setData((d) => ({ ...d, scores }));
  }, []);
  const refreshProjects = useCallback(async () => {
    const [projects, criteria, projectResults] = await Promise.all([projectsApi.list(), projectsApi.criteria(), projectsApi.results()]);
    setData((d) => ({ ...d, projects, criteria, projectResults }));
  }, []);
  const refreshStudents = useCallback(async () => {
    const students = await studentsApi.list();
    setData((d) => ({ ...d, students }));
  }, []);
  const refreshRewards = useCallback(async () => {
    const [rewards, purchases, transactions] = await Promise.all([rewardsApi.list(), rewardsApi.purchases(), transactionsApi.list()]);
    setData((d) => ({ ...d, rewards, purchases, transactions }));
  }, []);
  const refreshLanguagePortfolio = useCallback(async () => {
    const languagePortfolio = await languagePortfolioApi.list();
    setData((d) => ({ ...d, languagePortfolio }));
  }, []);
  const refreshAnnouncements = useCallback(async () => {
    const announcements = await announcementsApi.list();
    setData((d) => ({ ...d, announcements }));
  }, []);
  const refreshSurveys = useCallback(async () => {
    const [surveys, surveyVotes] = await Promise.all([surveysApi.list(), surveysApi.votes()]);
    setData((d) => ({ ...d, surveys, surveyVotes }));
  }, []);
  const refreshConfig = useCallback(async () => {
    const config = await configApi.get();
    setData((d) => ({ ...d, config }));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <DataContext.Provider
      value={{
        ...data, loading, reload,
        refreshAttendance, refreshTasks, refreshScores, refreshProjects,
        refreshStudents, refreshRewards, refreshLanguagePortfolio,
        refreshAnnouncements, refreshSurveys, refreshConfig
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
