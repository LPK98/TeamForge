import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teamforge_mobile/main.dart';

void main() {
  testWidgets('unauthenticated users are sent to sign in', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: TeamForgeApp()));
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Welcome back'), findsOneWidget);
  });
}
