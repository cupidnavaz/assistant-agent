import ChatWidget from '@/components/chat/ChatWidget';
import AdminPage from '@/pages/admin/AdminPage';
import TeamPage from '@/pages/team/TeamPage';

function App() {
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminPage />;
  }

  if (window.location.pathname.startsWith('/team')) {
    return <TeamPage />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p>Start prompting (or editing) to see magic happen :)</p>
      </div>
      <ChatWidget />
    </>
  );
}

export default App;
