// iOS / Expo Go: k-ID's settings menu runs in our /kid/settings web page inside a WebView.
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { apiOrigin } from '@/lib/api';
import { C } from '@/lib/theme';
import type { Country, KidRecord, User } from '@/lib/types';

export function KidSettingsPanel({ user, country }: { user: User; country: Country; rec?: KidRecord }) {
  return (
    <View style={{ height: 620 }}>
      <WebView
        source={{ uri: `${apiOrigin()}/kid/settings?as=${user.id}&j=${country}&embed=1` }}
        style={{ flex: 1, backgroundColor: C.bg }}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}
