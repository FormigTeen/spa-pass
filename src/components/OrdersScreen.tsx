import { useRef } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { ORDERING_ORDERS } from "../graphql/operations";
import { core, gatewayErrorMessage } from "../lib/gateway";
import { restoreInbotTranscript } from "../lib/inbot";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  chatMessagesAtom,
  chatRestoringAtom,
  composerFocusAtom,
  mobileChatOpenAtom,
  selectedOrderIdAtom,
  sessionAtom,
  viewAtom,
} from "../state/atoms";
import { OrderCard, type OrderSummary } from "./OrderCard";

type OrderingOrder = {
  vtex?: {
    orderId?: string | null;
    status?: string | null;
    creationDate?: string | null;
    value?: number | null;
    items?: Array<{ name?: string | null }> | null;
  } | null;
  state?: { status?: string | null } | null;
};

const toSummary = (order: OrderingOrder): OrderSummary => ({
  orderId: order.vtex?.orderId ?? "",
  status: order.state?.status ?? null,
  createdAt: order.vtex?.creationDate ?? null,
  value: order.vtex?.value ?? null,
  items:
    order.vtex?.items
      ?.map((item) => item?.name ?? "")
      .filter((name): name is string => Boolean(name)) ?? [],
});

export function OrdersScreen() {
  const [selectedOrderId, setSelectedOrderId] = useAtom(selectedOrderIdAtom);
  const session = useAtomValue(sessionAtom);
  const setView = useSetAtom(viewAtom);
  const setMessages = useSetAtom(chatMessagesAtom);
  const setChatOpen = useSetAtom(mobileChatOpenAtom);
  const focusComposer = useSetAtom(composerFocusAtom);
  const setRestoring = useSetAtom(chatRestoringAtom);
  const isMobile = useIsMobile();

  const orders = useQuery({
    queryKey: ["ordering-orders", session?.email],
    enabled: Boolean(session?.email),
    queryFn: () =>
      core<{ orderingOrders: OrderingOrder[] }>(ORDERING_ORDERS, {
        limit: "10",
      }).then((data) =>
        data.orderingOrders.map(toSummary).filter((order) => order.orderId),
      ),
  });

  // Selecting again before the previous restore lands would otherwise show
  // the wrong order's transcript.
  const pending = useRef("");

  const prepare = useMutation({
    mutationFn: (orderId: string) => {
      if (!session?.email) throw new Error("session.email.required");
      return restoreInbotTranscript({ email: session.email, orderId });
    },
    onMutate: () => setRestoring(true),
    onSuccess: (messages, orderId) => {
      if (pending.current === orderId) setMessages(messages);
    },
    // A newer selection owns the state now, so let it finish on its own.
    onSettled: (_data, _error, orderId) => {
      if (pending.current === orderId) setRestoring(false);
    },
  });

  const onSelect = (orderId: string) => {
    pending.current = orderId;
    setSelectedOrderId(orderId);
    setMessages([]);
    prepare.mutate(orderId);
    // On mobile the chat lives behind the panel, so selecting takes you there.
    if (isMobile) setChatOpen(true);
    focusComposer((signal) => signal + 1);
  };

  const error = orders.error
    ? gatewayErrorMessage(orders.error, "Não foi possível carregar pedidos.")
    : prepare.error
      ? gatewayErrorMessage(prepare.error, "Não foi possível iniciar a sessão.")
      : "";

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-lg h-full flex flex-col pt-10 md:pt-14 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-14 gap-6"
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-medium text-cream tracking-tight">
          Agente de Troca/Devolução
        </h1>
        <p className="mt-2 text-sm text-cream/55 leading-relaxed">
          Escolha um pedido para liberar a conversa com o agente.
        </p>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-cream/10 bg-cream/5 p-3">
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-cream/45" aria-hidden />
          <p className="text-xs leading-relaxed text-cream/55">
            Para efeito de teste, o agente não considera o status do pedido —
            qualquer um pode ser usado na conversa.
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {orders.isLoading && (
          <div className="flex items-center gap-2 text-sm text-cream/50">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Carregando seus pedidos...
          </div>
        )}

        {orders.data?.map((order) => (
          <OrderCard
            key={order.orderId}
            order={order}
            selected={order.orderId === selectedOrderId}
            onSelect={() => onSelect(order.orderId)}
          />
        ))}

        {!orders.isLoading && orders.data?.length === 0 && (
          <p className="text-sm text-cream/50">
            Nenhum pedido recente encontrado nesta conta.
          </p>
        )}

        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>

      {/* Bottom — back, where signing out sits on the home screen. */}
      <div className="flex items-center h-14 md:h-auto">
        <button
          type="button"
          onClick={() => setView("start")}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-cream/20 px-5 py-3 text-sm font-medium text-cream/70 hover:border-cream hover:text-cream transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Voltar ao início
        </button>
      </div>
    </motion.div>
  );
}
