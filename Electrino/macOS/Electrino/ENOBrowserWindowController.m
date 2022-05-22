//
//  ENOBrowserWindowController.m
//  Electrino
//
//  Created by Pauli Olavi Ojala on 03/05/17.
//  Copyright © 2017 Pauli Olavi Ojala.
//
//  This software may be modified and distributed under the terms of the MIT license.  See the LICENSE file for details.
//

#import "ENOBrowserWindowController.h"
#import <JavaScriptCore/JavaScriptCore.h>


// The new WKWebView class doesn't give access to its JSContext (because it runs in a separate process);
// therefore it doesn't seem suitable for hosting Electrino apps.
// Let's just stick with good old WebView for now.
#define USE_WKWEBVIEW 0


#import "ENOJSProcess.h"
#import "ENOJSConsole.h"
#import "ENOJavaScriptApp.h"
#import "ENOJSTray.h"



@interface ENOBrowserWindowController () <WebFrameLoadDelegate>

#if USE_WKWEBVIEW
@property (nonatomic, strong) WKWebView *webView;
#else
@property (nonatomic, strong) WebView *webView;
#endif
@property (nonatomic, strong) ENOJSTray *tray;

@end



@implementation ENOBrowserWindowController

- (instancetype)initAsResizable:(BOOL)resizable hasFrame:(BOOL)hasFrame
{
    NSWindowStyleMask styleMask = 0;
    if (resizable) {
        styleMask |= NSWindowStyleMaskResizable;
    }
    if (hasFrame) {
        styleMask |= NSWindowStyleMaskTitled;
        styleMask |= NSWindowStyleMaskMiniaturizable;
    }
    
    NSWindow *window = [[NSWindow alloc] initWithContentRect:NSMakeRect(100, 100, 640, 480)
                                                   styleMask:styleMask
                                                     backing:NSBackingStoreBuffered
                                                       defer:NO];
    
    window.opaque = NO;
    window.hasShadow = YES;
    window.ignoresMouseEvents = NO;
    window.allowsConcurrentViewDrawing = YES;
    window.releasedWhenClosed = NO;
    
    
#if USE_WKWEBVIEW
    WKWebViewConfiguration *wkConf = [[WKWebViewConfiguration alloc] init];
    
    WKWebView *webView = [[WKWebView alloc] initWithFrame:window.contentView.bounds configuration:wkConf];
    
#else
    WebView *webView = [[WebView alloc] initWithFrame:window.contentView.frame];
    
    webView.frameLoadDelegate = self;
    
    webView.drawsBackground = NO;
    WebPreferences *prefs = [webView preferences];
    prefs.javaScriptEnabled = YES;
    prefs.plugInsEnabled = NO;
    
//    [prefs setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
    [prefs setValue:@YES forKey:@"allowUniversalAccessFromFileURLs"];
    //prefs.defaultFontSize = 20;
    
#endif
    
    window.contentView = webView;
    self.webView = webView;
    
    return [self initWithWindow:window];
}


- (void)loadURL:(NSURL *)url
{
    if (url.isFileURL) {
#if USE_WKWEBVIEW
        NSString *dir = [url.path stringByDeletingLastPathComponent];
        NSURL *baseURL = [NSURL fileURLWithPath:dir isDirectory:YES];
        
        NSLog(@"%s, using WKWebView, %@", __func__, url);

        [self.webView loadFileURL:url allowingReadAccessToURL:baseURL];
        
#else
        NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:url];
        [req setValue:@"Custom-Agent" forHTTPHeaderField:@"User-Agent"];
        
        [self.webView.mainFrame loadRequest:req];
        
#endif
    }
    else {
        NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
        NSMutableDictionary *cookieProperties = [NSMutableDictionary dictionary];
        [cookieProperties setObject:@"sessionid" forKey:NSHTTPCookieName];
        [cookieProperties setObject:@"berx0fj203jj1wbnt6k1u5p1b24zmtdy" forKey:NSHTTPCookieValue];
        [cookieProperties setObject:@".tradingview.com" forKey:NSHTTPCookieDomain];
        [cookieProperties setObject:@"cn.tradingview.com" forKey:NSHTTPCookieOriginURL];
        [cookieProperties setObject:@"/" forKey:NSHTTPCookiePath];
        [cookieProperties setObject:@"0" forKey:NSHTTPCookieVersion];
        [cookieProperties setObject:[NSDate dateWithTimeIntervalSinceNow:60*60] forKey:NSHTTPCookieExpires];//设置失效时间
        [cookieProperties setObject:@"0" forKey:NSHTTPCookieDiscard]; //设置sessionOnly
     
        NSHTTPCookie *cookie = [NSHTTPCookie cookieWithProperties:cookieProperties];
        [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookie:cookie];
        [self.webView.mainFrame loadRequest:request];
        // NSLog(@"** %s: only supports file urls", __func__);
    }
    
}

#if !USE_WKWEBVIEW
- (void)webView:(WebView *)webView didCreateJavaScriptContext:(JSContext *)jsContext forFrame:(WebFrame *)frame
{
    ENOJSProcess *process = [[ENOJSProcess alloc] init];
    jsContext[@"process"] = process;
    ENOJSConsole *vConsole = [[ENOJSConsole alloc] init];
    jsContext[@"vConsole"] = vConsole;
    
    ENOJavaScriptApp *jsApp = [ENOJavaScriptApp sharedApp];
    jsContext[@"jsModules"] = jsApp.jsModules;
    
    NSString* path = [[NSBundle mainBundle] pathForResource:@"app/index" ofType:@"js"];
    NSString* content = [NSString stringWithContentsOfFile:path
                                                  encoding:NSUTF8StringEncoding
                                                     error:NULL];
    [jsContext evaluateScript:content];
    
//    [NSApp terminate:self];
    
}

- (void)webView:(WebView *)webView didReceiveTitle:(NSString *)title forFrame:(WebFrame *)frame
{
    if (frame == self.webView.mainFrame) {
        self.window.title = title;
    }
}


- (void)webView:(WebView *)webView webViewDidFinishLoad:(WebView *)webView
{
    // 拼接JS的代码
    NSMutableString *JSStringM = [NSMutableString string];
    [JSStringM appendString:@"alert('ok');"];
    [webView stringByEvaluatingJavaScriptFromString:JSStringM];
}
#endif

@end
