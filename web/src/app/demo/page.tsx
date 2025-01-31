export default function Page() {
    return (
        <div className="w-full h-full flex justify-center p-4">
            <div className="w-full max-w-[800px]">
                <h2 className="w-full text-lg  text-gray-200 text-center mb-4">
                    Discord Bot Chess Game Demo
                </h2>
                <video
                    className="rounded-lg aspect-video w-full"
                    src="https://cloud-8lmyovqdb-hack-club-bot.vercel.app/0chess_demo.mp4"
                    controls
                />
            </div>
        </div>
    );
}
