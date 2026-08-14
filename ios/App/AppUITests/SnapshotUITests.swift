import XCTest

/// Captures the 5 App Store screenshots: Threads (home), a real recording in progress,
/// note detail, search results, and Reflect ("On my mind").
///
/// This file is scaffolding — it only runs once it's part of an Xcode UI Testing
/// target. See the setup note below for the one manual step needed to wire it up.
@MainActor
class SnapshotUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    /// The nav rail is a slide-over on narrow layouts (behind an "Open menu" button)
    /// but always visible in the wide/desktop layout — tap the menu only if it's there,
    /// then look for the target link/button either way.
    private func openNav(_ app: XCUIApplication) {
        let openMenu = app.buttons["Open menu"]
        if openMenu.exists {
            openMenu.tap()
        }
    }

    private func tapNavItem(_ app: XCUIApplication, label: String) -> Bool {
        openNav(app)
        let el = app.links[label].exists ? app.links[label] : app.buttons[label]
        guard el.waitForExistence(timeout: 3) else { return false }
        el.tap()
        return true
    }

    func testTakeScreenshots() throws {
        let app = XCUIApplication()
        setupSnapshot(app)

        // Force portrait — a rotated simulator flips the app into its wide/desktop
        // layout, which looks wrong for App Store screenshots.
        XCUIDevice.shared.orientation = .portrait

        app.launch()

        // Give the WebView + auth check + initial data fetch time to settle.
        sleep(4)

        // 1. Threads (home route "/")
        snapshot("01Threads")

        // 2. Real recording state — "New thought" opens the capture picker, then the
        // mic button ("Speak a new thought") starts an actual voice recording.
        if tapNavItem(app, label: "New thought") {
            sleep(1)
            let mic = app.buttons["Speak a new thought"]
            if mic.waitForExistence(timeout: 5) {
                mic.tap()
                sleep(2)
                snapshot("02Recording")
                if app.buttons["Cancel"].waitForExistence(timeout: 3) {
                    app.buttons["Cancel"].tap()
                }
            }
        }

        // 3. Note detail — open the first note from the rail, if one exists.
        sleep(1)
        openNav(app)
        let firstNote = app.links.matching(NSPredicate(format: "label BEGINSWITH 'Open note:'")).firstMatch
        if firstNote.waitForExistence(timeout: 3) {
            firstNote.tap()
            sleep(2)
            snapshot("03NoteDetail")
        }

        // 4. Search
        if tapNavItem(app, label: "Search") {
            sleep(2)
            snapshot("04Search")
        }

        // 5. Reflect ("On my mind")
        if tapNavItem(app, label: "Reflect") {
            sleep(2)
            snapshot("05Reflect")
        }
    }
}
