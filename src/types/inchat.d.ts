/**
 * The E-Chat remote (`inchat`), served from https://echat.cvlb.tech. Federated
 * modules ship no types, so the contract from its README.mfe.md is restated here.
 */
declare module "inchat/InChatWidget" {
  export type InChatWidgetProps = {
    /** Origin the widget talks to. Its session is the gateway cookie. */
    gatewayOrigin?: string;
    /** Fired when nobody is authenticated and the person taps "Iniciar login". */
    onStartLogin?: () => void;
    /** Where the conversation's cards and actions land. */
    onRoute?: (intent: unknown) => void;
  };

  const InChatWidget: (props: InChatWidgetProps) => React.ReactElement;
  export default InChatWidget;
}
