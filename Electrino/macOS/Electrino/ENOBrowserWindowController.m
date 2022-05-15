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
        NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:url];
        [self.webView.mainFrame loadRequest:req];
        NSLog(@"** %s: only supports file urls", __func__);
    }
    
}

#if !USE_WKWEBVIEW
- (void)webView:(WebView *)webView didCreateJavaScriptContext:(JSContext *)jsContext forFrame:(WebFrame *)frame
{
    ENOJSProcess *process = [[ENOJSProcess alloc] init];
    jsContext[@"process"] = process;
    ENOJSConsole *vConsole = [[ENOJSConsole alloc] init];
    jsContext[@"vConsole"] = vConsole;
    
    ENOJavaScriptApp *jsModules = [ENOJavaScriptApp getjsModules];
    jsContext[@"jsModules"] = jsModules;
    
//    NSString *base64Str = @"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAStJREFUOE9jTMgoa2BkYLRnYGBwYCANHPjP8P8gY2Jm+RWG/wzapOmFqmZkuMqYmFH+nyzNMDOINaC8IJVhy+adDFfvPkKxD6sLKvKTGTZv2Q1XrKGmxBDk4cCwcesehr/MLAw3bt2DG4JigJSkGIOpsR6DtpIcw/U7Dxj+MTEx3L5xh6GkOAPF1qTMCuwGBHvYM3j7e8Ilb1+/zbBp626G4pIs8gy4c/0W2NkDb0CAlzOKF1onzycuDEBeaJs0j4HjxzeGorIchi2bdjLcunGb4QcHF3YDFIX4GMwNdRiUtdQZ7l67yfCPmZlh1a7DYMVhbrYMV+8+JC4dVOUlgQMPPdFgS7FYE5KRrDjDTzZ2og3YT0ZOhDnmACM4OzMyhpCcIxkZrv7//38NAFQalpXe0T44AAAAAElFTkSuQmCC";
//    NSData *data = [[NSData alloc] initWithBase64EncodedString:base64Str options:NSDataBase64DecodingIgnoreUnknownCharacters];
//    NSImage *image = [[NSImage alloc] initWithData:data];
//    ENOJSNativeImageInstance *jsImage = [[ENOJSNativeImageInstance alloc] init];
//    
//    [self.tray distroy];
//    jsImage.image = image;
//    ENOJSTray *tray = [[ENOJSTray alloc] initWithIcon:jsImage];
//    self.tray = tray;
//    
//    jsContext[@"tray"] = self.tray;
    
//    [NSApp terminate:self];
    
}

- (void)webView:(WebView *)webView didReceiveTitle:(NSString *)title forFrame:(WebFrame *)frame
{
    if (frame == self.webView.mainFrame) {
        self.window.title = title;
    }
}
#endif

@end
