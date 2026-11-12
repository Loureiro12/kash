import AppIntents
import Foundation

/// Lançamento rápido pelos atalhos do iPhone: Toque Atrás (Back Tap), Siri, app Atalhos, Spotlight
/// e o botão de Ação. A intent abre o app e grava o pedido em UserDefaults; o JS lê a chave
/// `kash.quickAdd` pelo `Settings` do React Native e abre o sheet (src/features/quickAdd).
/// Copiado para o projeto iOS pelo plugin `plugins/withQuickAddIntents.js` (não editar em ios/).
enum KashQuickAdd {
  static let key = "kash.quickAdd"

  static func request(_ kind: String) {
    UserDefaults.standard.set("\(kind):\(Int(Date().timeIntervalSince1970))", forKey: key)
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

/// Aparecem sozinhas no app Atalhos (seção Kash), no Spotlight e na Siri, sem a pessoa montar nada.
@available(iOS 16.0, *)
struct KashAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
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
  }
}
