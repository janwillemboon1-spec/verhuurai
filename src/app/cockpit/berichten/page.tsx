"use client";

import { useEffect, useState, useCallback } from "react";

interface Message {
  id: number;
  body: string;
  userId: number | null;
  insertionTime?: string;
}

interface Reservation {
  arrivalDate: string;
  departureDate: string;
  channelName: string;
  listingName: string;
}

interface Conversation {
  id: number;
  listingMapId: number;
  recipientName: string;
  hasUnreadMessages: number;
  messageReceivedOn: string;
  conversationMessages: Message[];
  Reservation: Reservation | null;
}

const CHANNEL_LABELS: Record<string, string> = {
  airbnbOfficial: "Airbnb",
  bookingCom: "Booking.com",
  vrbo: "Vrbo",
  direct: "Direct",
  homeaway: "HomeAway",
  expedia: "Expedia",
};

function formatPeriod(arrival: string, departure: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  return `${fmt(arrival)} – ${fmt(departure)}`;
}

interface DraftResult {
  dutchDraft: string;
  translatedDraft: string;
  detectedLang: string;
  guestName: string;
  lastMessage: string;
}

type AutoMode = boolean;

export default function CockpitBerichtenPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [editedTranslation, setEditedTranslation] = useState("");
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState<Set<number>>(new Set());
  const [autoMode, setAutoMode] = useState<AutoMode>(false);
  const [autoSaving, setAutoSaving] = useState(false);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/cockpit/berichten");
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
    fetch("/api/cockpit/instellingen")
      .then((r) => r.json())
      .then((d) => setAutoMode(d.auto_beantwoorden === "true"));
  }, [loadConversations]);

  // Poll every 10 minutes
  useEffect(() => {
    const interval = setInterval(loadConversations, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  async function selectConversation(conv: Conversation) {
    setSelected(conv);
    setDraft(null);
    setEditedTranslation("");
    setDraftLoading(true);

    const res = await fetch(`/api/cockpit/berichten/${conv.id}/draft`, { method: "POST" });
    const data = await res.json();
    setDraft(data);
    setEditedTranslation(data.translatedDraft ?? "");
    setDraftLoading(false);
  }

  async function handleSend() {
    if (!selected || !editedTranslation.trim()) return;
    setSending(true);
    await fetch(`/api/cockpit/berichten/${selected.id}/stuur`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editedTranslation }),
    });
    setSentIds((prev) => new Set(Array.from(prev).concat(selected.id)));
    setSending(false);
    setSelected(null);
    setDraft(null);
    setConversations((prev) => prev.filter((c) => c.id !== selected.id));
  }

  async function toggleAutoMode() {
    const newVal = !autoMode;
    setAutoMode(newVal);
    setAutoSaving(true);
    await fetch("/api/cockpit/instellingen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleutel: "auto_beantwoorden", waarde: String(newVal) }),
    });
    setAutoSaving(false);
  }

  const unreadCount = conversations.filter((c) => c.hasUnreadMessages && !sentIds.has(c.id)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2b3885]">Gastenberichten</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Laden..." : `${conversations.length} gesprekken`}
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {unreadCount} ongelezen
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {autoMode ? "Automatisch verzenden" : "Goedkeuring vereist"}
          </span>
          <button
            onClick={toggleAutoMode}
            disabled={autoSaving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoMode ? "bg-green-500" : "bg-gray-200"
            } ${autoSaving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
            role="switch"
            aria-checked={autoMode}
            title={autoMode ? "Automatisch verzenden AAN — klik om uit te zetten" : "Goedkeuring vereist — klik om automatisch in te schakelen"}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex gap-6 min-h-[500px]">
        {/* Inbox lijst */}
        <div className="w-80 flex-shrink-0">
          {loading ? (
            <div className="text-sm text-gray-400">Gesprekken laden...</div>
          ) : conversations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
              Geen openstaande berichten
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected?.id === conv.id
                      ? "border-[#2b3885] bg-[#eef7fe]"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {conv.recipientName}
                    </span>
                    {conv.hasUnreadMessages > 0 && !sentIds.has(conv.id) && (
                      <span className="ml-2 w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                  </div>
                  {conv.Reservation && (
                    <p className="text-xs text-gray-500 mb-1">
                      {formatPeriod(conv.Reservation.arrivalDate, conv.Reservation.departureDate)}
                      <span className="mx-1 text-gray-300">·</span>
                      {CHANNEL_LABELS[conv.Reservation.channelName] ?? conv.Reservation.channelName}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 truncate">
                    {conv.conversationMessages?.[conv.conversationMessages.length - 1]?.body ?? ""}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail paneel */}
        <div className="flex-1">
          {!selected ? (
            <div className="h-full flex items-center justify-center bg-white border border-gray-200 rounded-xl text-sm text-gray-400">
              Selecteer een gesprek om te beantwoorden
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-gray-900">{selected.recipientName}</h2>
                <p className="text-xs text-gray-400">
                  {selected.Reservation
                    ? `${formatPeriod(selected.Reservation.arrivalDate, selected.Reservation.departureDate)} · ${CHANNEL_LABELS[selected.Reservation.channelName] ?? selected.Reservation.channelName}`
                    : `Gesprek #${selected.id}`}
                </p>
              </div>

              {/* Laatste bericht van gast */}
              {draft && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bericht gast</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{draft.lastMessage}</p>
                </div>
              )}

              {draftLoading && (
                <div className="text-sm text-gray-400 animate-pulse">AI-draft genereren...</div>
              )}

              {draft && !draftLoading && (
                <>
                  {/* Nederlandse concept (leesbaar voor jou) */}
                  <div className="bg-[#eef7fe] rounded-lg p-4 border border-blue-100">
                    <p className="text-xs font-semibold text-[#2b3885] uppercase mb-1">
                      Concept (NL — ter controle)
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{draft.dutchDraft}</p>
                  </div>

                  {/* Te verzenden bericht (bewerkbaar) */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Te verzenden{" "}
                      {draft.detectedLang !== "nl" && (
                        <span className="normal-case font-normal text-gray-400">
                          (vertaald naar {draft.detectedLang.toUpperCase()})
                        </span>
                      )}
                    </p>
                    <textarea
                      value={editedTranslation}
                      onChange={(e) => setEditedTranslation(e.target.value)}
                      rows={5}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#2b3885] resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleSend}
                      disabled={sending || !editedTranslation.trim()}
                      className="px-4 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? "Verzenden..." : "Versturen"}
                    </button>
                    <button
                      onClick={() => { setSelected(null); setDraft(null); }}
                      className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
