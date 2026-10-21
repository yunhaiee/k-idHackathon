// iOS / Expo Go: @k-id/core needs a browser, so the native app hosts our own /kid/gate web page
// (which runs the real SDK) in a WebView. Results land on our server; the app polls and opens on 'pass'.
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Note } from '@/components/ui';
import { apiOrigin } from '@/lib/api';
import { C } from '@/lib/theme';
import type { Country, KidRecord, User } from '@/lib/types';

export function KidGate({ user, country, path = '/kid/gate' }: { user: User; country: Country; rec?: KidRecord; path?: string }) {
  const origin = apiOrigin();
  const insecure = origin.startsWith('http://') && !origin.includes('localhost');
  return (
    <View style={{ flex: 1, minHeight: 560 }}>
      {insecure ? (
        <View style={{ padding: 16 }}>
          <Note tone="warn" title="k-ID needs https">
            Start the dev server with --tunnel (or set EXPO_PUBLIC_API_URL to the Cloud Run URL).
          </Note>
        </View>
      ) : null}
      <WebView
        source={{ uri: `${origin}${path}?as=${user.id}&j=${country}&embed=1` }}
        style={{ flex: 1, backgroundColor: C.bg }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
      />
    </View>
  );
}
