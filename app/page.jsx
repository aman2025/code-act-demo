import ChatView from '../components/ChatView'

export default function Home() {
  return (
    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <ChatView />
    </div>
  )
}