import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';

import MainLayout from '@/layouts/MainLayout';
import ReaderLayout from '@/layouts/ReaderLayout';
import AdminLayout from '@/layouts/AdminLayout';

import Home from '@/pages/Home';
import NovelCatalog from '@/pages/NovelCatalog';
import NovelDetail from '@/pages/NovelDetail';
import ChapterList from '@/pages/ChapterList';
import Reader from '@/pages/Reader';
import Ranking from '@/pages/Ranking';
import Library from '@/pages/Library';
import History from '@/pages/History';
import Search from '@/pages/Search';
import Profile from '@/pages/Profile';
import MyComments from '@/pages/MyComments';
import Settings from '@/pages/Settings';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Notifications from '@/pages/Notifications';

import AdminDashboard from '@/pages/admin/Dashboard';
import AdminNovels from '@/pages/admin/Novels';
import AdminChapters from '@/pages/admin/Chapters';
import AdminUsers from '@/pages/admin/Users';
import AdminComments from '@/pages/admin/Comments';
import AdminGenres from '@/pages/admin/Genres';
import AdminReports from '@/pages/admin/Reports';
import AdminStatistics from '@/pages/admin/Statistics';
import AdminSettings from '@/pages/admin/Settings';
import AuthorDashboard from '@/pages/AuthorDashboard';
import CreateNovel from '@/pages/CreateNovel';
import AuthorRoute from '@/routes/AuthorRoute';
import AuthorNovels from '@/pages/AuthorNovels';
import EditNovel from '@/pages/EditNovel';
import AuthorChapters from '@/pages/AuthorChapters';
import CreateChapter from '@/pages/CreateChapter';
import AuthorChapterSelect from '@/pages/AuthorChapterSelect';
import EditChapter from '@/pages/EditChapter';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* =========================
              MAIN WEBSITE
          ========================== */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/novel" element={<NovelCatalog />} />
            <Route path="/novel/:slug" element={<NovelDetail />} />
            <Route
              path="/novel/:slug/chapters"
              element={<ChapterList />}
            />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/library" element={<Library />} />
            <Route path="/history" element={<History />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/comments" element={<MyComments />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* =========================
              READER
          ========================== */}
          <Route element={<ReaderLayout />}>
            <Route
              path="/read/:novelSlug/:chapterNumber"
              element={<Reader />}
            />
          </Route>

          {/* =========================
              DASHBOARD PENULIS
          ========================== */}
          <Route element={<AuthorRoute />}>
            <Route path="/author" element={<AuthorDashboard />} />
            <Route path="/author/create" element={<CreateNovel />} />
            <Route path="/author/novels" element={<AuthorNovels />} />
            <Route path="/author/novels/:id/edit" element={<EditNovel />} />
            <Route path="/author/novels/:id/chapters"element={<AuthorChapters />} />
            <Route path="/author/novels/:id/chapters/new" element={<CreateChapter />} />
            <Route path="/author/novels/:id/chapters/:chapterId/edit"element={<EditChapter />} />
            <Route path="/author/chapters" element={<AuthorChapterSelect />} />
          </Route>
          
          {/* =========================
              ADMIN
          ========================== */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="novels" element={<AdminNovels />} />
            <Route path="chapters" element={<AdminChapters />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="comments" element={<AdminComments />} />
            <Route path="genres" element={<AdminGenres />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="statistics" element={<AdminStatistics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;