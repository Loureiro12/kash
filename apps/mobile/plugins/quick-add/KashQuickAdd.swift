import AppIntents
import Foundation

/// Lançamento rápido pelos atalhos do iPhone: Toque Atrás (Back Tap), Siri, app Atalhos, Spotlight
/// e o botão de Ação. A intent abre o app e grava o pedido em UserDefaults; o JS lê a chave
/// `kash.quickAdd` pelo `Settings` do React Native e abre o sheet (src/features/quickAdd).
/// Copiado para o projeto iOS pelo plugin `plugins/withQuickAddIntents.js` (não editar em ios/).
enum KashQuickAdd {
  static let key = "kash.quickAdd"
  /// texto dito ou digitado na Siri ("gastei 30 no Uber"), lido junto com o pedido `text:<segundos>`
  static let textKey = "kash.quickAdd.text"

  static func request(_ kind: String) {
    UserDefaults.standard.set("\(kind):\(Int(Date().timeIntervalSince1970))", forKey: key)
  }

  static func requestText(_ text: String) {
    UserDefaults.standard.set(String(text.prefix(300)), forKey: textKey)
    request("text")
  }
}

/// "Lançar no Kash": a Siri pergunta o que lançar e a pessoa diz ou digita ("gastei 30 no Uber").
/// O app abre direto na confirmação do lançamento (o assistente interpreta o texto), sem o chat.
@available(iOS 16.0, *)
struct LancarPorTextoIntent: AppIntent {
  static let title: LocalizedStringResource = "Lançar no Kash"
  static let description: IntentDescription? = IntentDescription("Diga ou escreva o que gastou ou recebeu (ex.: “gastei 30 no Uber”) e o Kash prepara o lançamento para você confirmar.")
  static let openAppWhenRun: Bool = true

  @Parameter(title: "O que lançar", requestValueDialog: IntentDialog("O que você quer lançar?"))
  var texto: String

  @MainActor
  func perform() async throws -> some IntentResult {
    KashQuickAdd.requestText(texto)
    return .result()
  }
}

@available(iOS 16.0, *)
struct LancarGastoIntent: AppIntent {
  static let title: LocalizedStringResource = "Lançar gasto"
  static let description: IntentDescription? = IntentDescription("Abre o Kash direto no lançamento de um gasto.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    KashQuickAdd.request("expense")
    return .result()
  }
}

@available(iOS 16.0, *)
struct LancarEntradaIntent: AppIntent {
  static let title: LocalizedStringResource = "Lançar entrada"
  static let description: IntentDescription? = IntentDescription("Abre o Kash direto no lançamento de uma entrada.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    KashQuickAdd.request("income")
    return .result()
  }
}

@available(iOS 16.0, *)
struct PerguntarAoKashIntent: AppIntent {
  static let title: LocalizedStringResource = "Perguntar ao Kash"
  static let description: IntentDescription? = IntentDescription("Abre o assistente do Kash para perguntar sobre seus gastos ou lançar uma compra escrevendo.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    KashQuickAdd.request("assistant")
    return .result()
  }
}

/// Aparecem sozinhas no app Atalhos (seção Kash), no Spotlight e na Siri, sem a pessoa montar nada.
@available(iOS 16.0, *)
struct KashAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LancarPorTextoIntent(),
      phrases: ["Lançar no \(.applicationName)", "Anotar no \(.applicationName)", "Registrar no \(.applicationName)"],
      shortTitle: "Lançar no Kash",
      systemImageName: "text.bubble"
    )
    AppShortcut(
      intent: LancarGastoIntent(),
      phrases: ["Lançar gasto no \(.applicationName)", "Novo gasto no \(.applicationName)", "\(.applicationName) gasto"],
      shortTitle: "Lançar gasto",
      systemImageName: "minus.circle"
    )
    AppShortcut(
      intent: LancarEntradaIntent(),
      phrases: ["Lançar entrada no \(.applicationName)", "Nova entrada no \(.applicationName)", "\(.applicationName) entrada"],
      shortTitle: "Lançar entrada",
      systemImageName: "plus.circle"
    )
    AppShortcut(
      intent: PerguntarAoKashIntent(),
      phrases: ["Perguntar ao \(.applicationName)", "Abrir o assistente do \(.applicationName)", "\(.applicationName) assistente"],
      shortTitle: "Perguntar ao Kash",
      systemImageName: "sparkles"
    )
  }
}
