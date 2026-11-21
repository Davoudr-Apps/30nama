(function () {
  var S = {
    en: {
      suggestions: 'Suggestions', cwEmpty: 'Nothing in progress yet. Start something and it shows up here.', watchlist: 'Watchlist', liked: 'Liked',
      watchHint: 'Yellow button on any poster adds or removes it', likeHint: 'Blue button on any poster likes or unlikes it', listEmpty: 'Nothing here yet.',
      addedWatch: 'Added to watchlist', removedWatch: 'Removed from watchlist', addedLike: 'Liked', removedLike: 'Unliked', addWatch: 'Watchlist', inWatch: 'In watchlist', like: 'Like', liked1: 'Liked',
      theme: 'Theme', th_media: 'Match the selected title', th_media_n: 'Background follows the selected poster', th_crimson: 'Crimson', th_ocean: 'Ocean', th_emerald: 'Emerald', th_amber: 'Amber', th_violet: 'Violet', splashLook: 'Launch screen', splashNote: 'Shown when the app opens. Pick one to preview it; it is used from the next launch.', sp_mosaic: 'Poster Mosaic', sp_persian: 'Persian Wordmark', sp_light: 'Minimal Light', sp_curtain: 'Curtain & Letterbox', sp_aurora: 'Aurora Glass', sp_leader: 'Countdown Leader',
      leaveTitle: 'Stop watching?', leaveBody: 'Go back to the main page. Your place is saved.', yes: 'Yes', no: 'No',
      quality: 'Quality', cw: 'Continue watching',
      fontFa: 'Persian font', fontEn: 'English font', fontMissing: '%s is not installed on this TV, %t is used instead', bgShape: 'Background shape', shapeLine: 'Per line', shapeBlock: 'One piece',
      fontWeight: 'Font weight', wRegular: 'Regular', wMedium: 'Medium', wBold: 'Bold', wHeavy: 'Heavy',
      subsAudio: 'Subtitles & audio', panelHint: '▲▼ choose  ·  ◀▶ change  ·  BACK close', sub1: 'Subtitle 1', sub2: 'Subtitle 2', onTop: 'On top', audioTrack: 'Track',
      appearance: 'Appearance', textColor: 'Text colour', subBg: 'Background', bgOpacity: 'Background opacity', corners: 'Corners', square: 'Square', soft: 'Soft', rounded: 'Rounded', round: 'Round',
      subPos: 'Height from bottom', size2: 'Subtitle 2 size', sync: 'Sync', sync1: 'Subtitle 1 delay', sync2: 'Subtitle 2 delay', resetStyle: 'Reset appearance', resetDone: 'Appearance reset',
      noSubs: 'No subtitles for this title', endsAt: 'Ends at', defSubs2: 'Second subtitle', subStyle: 'Subtitle appearance', subStyleNote: 'You can also change all of this while watching: the Subtitles & audio button, or the red button.',
      cWhite: 'White', cYellow: 'Yellow', cCyan: 'Cyan', cGreen: 'Green', bgNone: 'None', cBlack: 'Black', cSlate: 'Slate', cNavy: 'Navy', cWine: 'Wine',
      home: 'Home', search: 'Search', archive: 'Archive', settings: 'Settings', movies: 'Movies', series: 'Series', anime: 'Anime', account: 'Account',
      signIn: 'Sign in', scanTitle: 'Scan with your phone', step1: 'Open the camera', step2: 'Scan the code', step3: 'Confirm on 30nama.com',
      orVisit: 'Or visit 30nama.com/auth and enter', waiting: 'Waiting for scan…', expired: 'Code expired',
      guest: 'Continue as guest', refresh: 'New code', loading: 'Loading...', error: 'Something went wrong', retry: 'Retry',
      continueWatching: 'Continue', hero_header: 'Featured', new_releases: 'New releases', suggested: 'Suggested',
      top_10: 'Top 10', top10: 'Top 10',
      play: 'Play', resume: 'Resume', details: 'Details', episodes: 'Episodes', season: 'Season', seasons: 'seasons', episode: 'Episode', nowPlaying: 'Now playing', watched: 'Watched', tryAgain: 'Please try again in a moment.', cast: 'Cast', featured: 'Featured',
      movie: 'Movie', persianSub: 'Persian subtitles', minLeft: 'min left', min: 'min', free: 'FREE', soon: 'SOON',
      loginRequired: 'Sign in to stream and continue watching', playLogin: 'Sign in to watch', noResults: 'No results', nothingFor: 'Nothing for',
      popularNow: 'Popular now', topResults: 'Top results', searchPh: 'Search movies, series, anime', kbHint: '◀ ▶ ▲ ▼ to type · Right to results',
      space: 'Space', clearK: 'Clear', browse: 'Browse', categories: 'Categories', genres: 'Genres', newest: 'Newest', top250: 'IMDb Top 250', soonTab: 'Soon', soonTag: 'Soon', soonEmpty: 'Nothing coming soon right now.', added: 'Recently added', popular: 'Popular', updated: 'Updated', results: 'results',
      language: 'Language', logout: 'Sign out', login: 'Sign in (QR)', guestAcc: 'Guest', expires: 'Subscription expires', unknown: 'unknown', userType: 'Account type',
      playback: 'Playback', display: 'Display', about: 'About', defSubs: 'Default subtitles', subSize: 'Subtitle size', autoplay: 'Autoplay next episode', reduce: 'Reduce motion',
      on: 'On', off: 'Off', small: 'Small', medium: 'Medium', large: 'Large', sample: 'This is how subtitles will look.',
      version: 'Version', unofficial: 'Unofficial client for 30nama.com', apiHost: 'API host',
      skipIntro: 'Skip intro', skipRecap: 'Skip recap', nextEpisode: 'Next episode', playNow: 'Play now', credits: 'Credits', audio: 'Audio', subtitles: 'Subtitles',
      english: 'English', persian: 'Persian', noStream: 'No stream available', loadMore: 'Load more',
      exitTitle: 'Exit 30nama?', exitBody: 'You can come back any time.', exit: 'Exit', cancel: 'Cancel', logoutTitle: 'Sign out?', logoutBody: 'You will need to scan a new code to sign in again.',
      hintPlayer: '▲ Audio & subtitles  ·  OK Play/Pause', hintPlayerEps: '▲ Audio & subtitles  ·  OK Play/Pause  ·  ▼ Episodes',
      welcome: 'Welcome', subFailed: 'Subtitle failed', playErr: 'Playback error',
      trendingWeek: 'Trending this week', newSeries: 'New & returning series', popularMovies: 'Popular movies now', trendingNow: 'Trending',
      crew: 'Crew', reviews: 'Reviews', moreLikeThis: 'More like this', nextEp: 'Next episode', newSeason: 'New season', close: 'Close', tmdb: 'TMDB metadata', tmdbOn: 'Connected', tmdbMock: 'Mock data', tmdbOff: 'Not configured', clearCache: 'Clear metadata cache', cleared: 'Cache cleared', tmdbCredit: 'Movie data from TMDB. Not endorsed or certified by TMDB.',
      Creator: 'Creator', Director: 'Director', Writer: 'Writer', Composer: 'Composer', 'Executive Producer': 'Executive producer', readMore: 'OK to read', scrollHint: '▲ ▼ scroll'
    },
    fa: {
      suggestions: 'پیشنهادها', cwEmpty: 'هنوز چیزی در حال تماشا نیست.', watchlist: 'لیست تماشا', liked: 'پسندیده‌ها',
      watchHint: 'دکمه زرد روی هر پوستر آن را به لیست اضافه یا حذف می‌کند', likeHint: 'دکمه آبی روی هر پوستر آن را می‌پسندد یا برمی‌دارد', listEmpty: 'هنوز چیزی اینجا نیست.',
      addedWatch: 'به لیست تماشا اضافه شد', removedWatch: 'از لیست تماشا حذف شد', addedLike: 'پسندیده شد', removedLike: 'از پسندیده‌ها حذف شد', addWatch: 'لیست تماشا', inWatch: 'در لیست تماشا', like: 'پسندیدن', liked1: 'پسندیده',
      theme: 'پوسته', th_media: 'هماهنگ با عنوان انتخاب‌شده', th_media_n: 'پس‌زمینه از پوستر انتخاب‌شده', th_crimson: 'قرمز', th_ocean: 'آبی', th_emerald: 'سبز', th_amber: 'کهربایی', th_violet: 'بنفش', splashLook: 'صفحه شروع', splashNote: 'هنگام باز شدن برنامه نمایش داده می‌شود. با انتخاب هر گزینه پیش‌نمایش آن پخش می‌شود و از اجرای بعدی استفاده می‌شود.', sp_mosaic: 'دیوار پوسترها', sp_persian: 'نام فارسی', sp_light: 'روشن و ساده', sp_curtain: 'پرده و قاب سینمایی', sp_aurora: 'شیشه و شفق', sp_leader: 'شمارش معکوس فیلم',
      leaveTitle: 'پخش متوقف شود؟', leaveBody: 'به صفحه اصلی برمی‌گردید. جای تماشا ذخیره می‌شود.', yes: 'بله', no: 'خیر',
      quality: 'کیفیت', cw: 'ادامه تماشا',
      fontFa: 'قلم فارسی', fontEn: 'قلم انگلیسی', fontMissing: '%s روی این تلویزیون نصب نیست، از %t استفاده می‌شود', bgShape: 'شکل پس‌زمینه', shapeLine: 'هر خط جدا', shapeBlock: 'یکپارچه',
      fontWeight: 'ضخامت قلم', wRegular: 'معمولی', wMedium: 'متوسط', wBold: 'ضخیم', wHeavy: 'خیلی ضخیم',
      subsAudio: 'زیرنویس و صدا', panelHint: '▲▼ انتخاب  ·  ◀▶ تغییر  ·  BACK بستن', sub1: 'زیرنویس ۱', sub2: 'زیرنویس ۲', onTop: 'بالاتر', audioTrack: 'ترک',
      appearance: 'ظاهر', textColor: 'رنگ متن', subBg: 'پس‌زمینه', bgOpacity: 'شفافیت پس‌زمینه', corners: 'گوشه‌ها', square: 'تیز', soft: 'نرم', rounded: 'گرد', round: 'خیلی گرد',
      subPos: 'فاصله از پایین', size2: 'اندازه زیرنویس ۲', sync: 'همگام‌سازی', sync1: 'تأخیر زیرنویس ۱', sync2: 'تأخیر زیرنویس ۲', resetStyle: 'بازنشانی ظاهر', resetDone: 'ظاهر بازنشانی شد',
      noSubs: 'زیرنویسی برای این عنوان نیست', endsAt: 'پایان', defSubs2: 'زیرنویس دوم', subStyle: 'ظاهر زیرنویس', subStyleNote: 'همه این‌ها را هنگام تماشا هم می‌توانید تغییر دهید: دکمه «زیرنویس و صدا» یا دکمه قرمز.',
      cWhite: 'سفید', cYellow: 'زرد', cCyan: 'فیروزه‌ای', cGreen: 'سبز', bgNone: 'بدون', cBlack: 'مشکی', cSlate: 'خاکستری', cNavy: 'سرمه‌ای', cWine: 'زرشکی',
      home: 'خانه', search: 'جستجو', archive: 'آرشیو', settings: 'تنظیمات', movies: 'فیلم', series: 'سریال', anime: 'انیمه', account: 'حساب',
      signIn: 'ورود', scanTitle: 'با گوشی اسکن کنید', step1: 'دوربین را باز کنید', step2: 'کد را اسکن کنید', step3: 'در ۳۰نما تأیید کنید',
      orVisit: 'یا به 30nama.com/auth بروید و وارد کنید', waiting: 'در انتظار اسکن…', expired: 'کد منقضی شد',
      guest: 'ادامه به عنوان مهمان', refresh: 'کد جدید', loading: 'در حال بارگذاری...', error: 'مشکلی پیش آمد', retry: 'تلاش دوباره',
      continueWatching: 'ادامه', hero_header: 'ویژه', new_releases: 'تازه‌ها', suggested: 'پیشنهادی',
      top_10: '۱۰ برتر', top10: '۱۰ برتر',
      play: 'پخش', resume: 'ادامه', details: 'جزئیات', episodes: 'قسمت‌ها', season: 'فصل', seasons: 'فصل', episode: 'قسمت', nowPlaying: 'در حال پخش', watched: 'دیده‌شده', tryAgain: 'لطفاً کمی بعد دوباره تلاش کنید.', cast: 'بازیگران', featured: 'ویژه',
      movie: 'فیلم', persianSub: 'زیرنویس فارسی', minLeft: 'دقیقه مانده', min: 'دقیقه', free: 'رایگان', soon: 'به‌زودی',
      loginRequired: 'برای پخش و ادامه تماشا وارد شوید', playLogin: 'برای تماشا وارد شوید', noResults: 'نتیجه‌ای نیست', nothingFor: 'چیزی پیدا نشد برای',
      popularNow: 'محبوب این روزها', topResults: 'بهترین نتیجه‌ها', searchPh: 'جستجوی فیلم، سریال، انیمه', kbHint: 'با جهت‌نما تایپ کنید · چپ برای نتایج',
      space: 'فاصله', clearK: 'پاک', browse: 'مرور', categories: 'دسته‌ها', genres: 'ژانرها', newest: 'جدیدترین', top250: '۲۵۰ برتر IMDb', soonTab: 'به‌زودی', soonTag: 'به‌زودی', soonEmpty: 'فعلاً عنوانی در راه نیست.', added: 'تازه اضافه‌شده', popular: 'محبوب', updated: 'به‌روزشده', results: 'نتیجه',
      language: 'زبان', logout: 'خروج از حساب', login: 'ورود (QR)', guestAcc: 'مهمان', expires: 'پایان اشتراک', unknown: 'نامشخص', userType: 'نوع حساب',
      playback: 'پخش', display: 'نمایش', about: 'درباره', defSubs: 'زیرنویس پیش‌فرض', subSize: 'اندازه زیرنویس', autoplay: 'پخش خودکار قسمت بعد', reduce: 'کاهش حرکت',
      on: 'روشن', off: 'خاموش', small: 'کوچک', medium: 'متوسط', large: 'بزرگ', sample: 'زیرنویس به این شکل نمایش داده می‌شود.',
      version: 'نسخه', unofficial: 'نرم‌افزار غیررسمی ۳۰نما', apiHost: 'سرور API',
      skipIntro: 'رد کردن تیتراژ', skipRecap: 'رد کردن خلاصه', nextEpisode: 'قسمت بعد', playNow: 'پخش اکنون', credits: 'تیتراژ پایانی', audio: 'صدا', subtitles: 'زیرنویس',
      english: 'انگلیسی', persian: 'فارسی', noStream: 'پخش در دسترس نیست', loadMore: 'بیشتر',
      exitTitle: 'خروج از ۳۰نما؟', exitBody: 'هر زمان بخواهید می‌توانید برگردید.', exit: 'خروج', cancel: 'انصراف', logoutTitle: 'خروج از حساب؟', logoutBody: 'برای ورود دوباره باید کد جدیدی اسکن کنید.',
      hintPlayer: '▲ صدا و زیرنویس  ·  OK پخش/توقف', hintPlayerEps: '▲ صدا و زیرنویس  ·  OK پخش/توقف  ·  ▼ قسمت‌ها',
      welcome: 'خوش آمدید', subFailed: 'خطا در زیرنویس', playErr: 'خطای پخش',
      trendingWeek: 'پرطرفدار این هفته', newSeries: 'سریال‌های جدید و ادامه‌دار', popularMovies: 'فیلم‌های محبوب امروز', trendingNow: 'پرطرفدار',
      crew: 'عوامل', reviews: 'نقد و نظر', moreLikeThis: 'مشابه این', nextEp: 'قسمت بعد', newSeason: 'فصل جدید', close: 'بستن', tmdb: 'اطلاعات TMDB', tmdbOn: 'متصل', tmdbMock: 'داده آزمایشی', tmdbOff: 'تنظیم نشده', clearCache: 'پاک کردن حافظه نهان', cleared: 'پاک شد', tmdbCredit: 'اطلاعات فیلم‌ها از TMDB. مورد تأیید TMDB نیست.',
      Creator: 'سازنده', Director: 'کارگردان', Writer: 'نویسنده', Composer: 'آهنگساز', 'Executive Producer': 'تهیه‌کننده اجرایی', readMore: 'OK برای خواندن', scrollHint: '▲ ▼ پیمایش'
    }
  };
  N.lang = N.store.get('lang', 'en');
  N.t = function (k) { var d = S[N.lang] || S.en; return d[k] !== undefined ? d[k] : (S.en[k] !== undefined ? S.en[k] : k); };
  N.setLang = function (l) {
    N.lang = l; N.store.set('lang', l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'fa' ? 'rtl' : 'ltr';
  };
  N.isRtl = function () { return N.lang === 'fa'; };
  document.documentElement.lang = N.lang;
  document.documentElement.dir = N.lang === 'fa' ? 'rtl' : 'ltr';
})();
