import MapEventsClient from "@/src/components/MapEventsClient";
import NewEventButton from "@/src/components/NewEventButton";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Map</h1>
      <div className="mt-3">
        <NewEventButton />
      </div>

      <div className="mt-6 h-[500px] w-full overflow-hidden rounded-xl">
        <MapEventsClient initialCenter={[32.0853, 34.7818]} initialZoom={13} />
      </div>
    </main>
  );
}
