//
//  ENOJSBrowserWindow.m
//  Electrino
//
//  Created by Pauli Olavi Ojala on 03/05/17.
//  Copyright © 2017 Pauli Olavi Ojala.
//
//  This software may be modified and distributed under the terms of the MIT license.  See the LICENSE file for details.
//

#import "ENOJSBrowserWindow.h"
#import "ENOBrowserWindowController.h"


@interface ENOJSBrowserWindow ()

@property (nonatomic, strong) NSMutableDictionary *eventCallbacks;
@property (nonatomic, strong) NSString *injectScript;

@end


@implementation ENOJSBrowserWindow

- (instancetype)initWithOptions:(NSDictionary *)opts
{
    self = [super init];
    
    //NSLog(@"%s, %@", __func__, opts);
    self.eventCallbacks = [NSMutableDictionary dictionary];

    id val;
    BOOL show = YES;
    BOOL resizable = YES;
    BOOL hasFrame = YES;
    BOOL closable = YES;
    BOOL minimizable = YES;
    BOOL maximizable = YES;
    NSString *injectScript = @"";
    
    if ((val = opts[@"injectScript"])) {
        injectScript = opts[@"injectScript"];
    }
    self.injectScript = injectScript;
    if ((val = opts[@"show"])) {
        show = [val boolValue];
    }
    if ((val = opts[@"resizable"])) {
        resizable = [val boolValue];
    }
    if ((val = opts[@"frame"])) {
        hasFrame = [val boolValue];
    }
    if ((val = opts[@"closable"])) {
        closable = [val boolValue];
    }
    if ((val = opts[@"minimizable"])) {
        minimizable = [val boolValue];
    }
    if ((val = opts[@"maximizable"])) {
        maximizable = [val boolValue];
    }
    
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(didCreateJSContext:) name:@"DidCreateContextNotification" object:nil];

    self.windowController = [[ENOBrowserWindowController alloc] initAsResizable:resizable hasFrame:hasFrame];
    
    NSWindow *win = self.windowController.window;
    NSRect frame = win.frame;
    if ((val = opts[@"width"]) && [val integerValue] > 0) {
        frame.size.width = [val doubleValue];
    }
    if ((val = opts[@"height"]) && [val integerValue] > 0) {
        frame.size.height = [val doubleValue];
    }

    [win setFrame:frame display:NO];
    [win center];
    [[win standardWindowButton:NSWindowCloseButton] setEnabled:closable];
    [[win standardWindowButton:NSWindowMiniaturizeButton] setEnabled:minimizable];
    [[win standardWindowButton:NSWindowZoomButton] setEnabled:maximizable];
    
    
    if (show)
        [self show];
    
    return self;
}

- (void)loadURL:(NSString *)urlStr
{
    NSURL *url = [NSURL URLWithString:urlStr];
    
    [self.windowController loadURL:url];
}

- (void)reload
{
    [self.windowController reload];
}

- (void)evalScript:(NSString *)js
{
    dispatch_time_t popTime = dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2 * NSEC_PER_SEC));
    dispatch_after(popTime, dispatch_get_main_queue(), ^(void){
        [self.windowController evalScript:js];
    });
}

- (void)on:(NSString *)event withCallback:(JSValue *)cb
{
    if (event.length > 0 && cb) {
        NSMutableArray *cbArr = self.eventCallbacks[event] ?: [NSMutableArray array];
        [cbArr addObject:cb];
        
        self.eventCallbacks[event] = cbArr;
    }
}

- (void)didCreateJSContext:(NSNotification *)notification
{
//    NSString* path = [[NSBundle mainBundle] pathForResource:@"app/index" ofType:@"js"];
//    NSString* content = [NSString stringWithContentsOfFile:path
//                                                  encoding:NSUTF8StringEncoding
//                                                     error:NULL];
//    [self.windowController.webView.mainFrame.javaScriptContext evaluateScript:content];
    
    [self.windowController.webView.mainFrame.javaScriptContext evaluateScript:self.injectScript];
    
    for (JSValue *cb in self.eventCallbacks[@"created"]) {
        [cb callWithArguments:@[self]];
    }
}

- (BOOL)isVisible
{
    return self.windowController.window.visible;
}

- (void)show
{
    [self.windowController showWindow:self];
    [[NSApplication sharedApplication] activateIgnoringOtherApps:YES];
}

- (void)hide
{
    [self.windowController.window orderOut:nil];
}

- (void)focus
{
    [self.windowController.window makeKeyWindow];
}

- (void)setPositionX:(double)x y:(double)y
{
    NSRect r = self.windowController.window.frame;
    r.origin = NSMakePoint(x, y - r.size.height);
    
    //NSLog(@"setting window frame: %@", NSStringFromRect(r));
    [self.windowController.window setFrameOrigin:r.origin];
}

- (NSDictionary *)getBounds
{
    NSRect r = self.windowController.window.frame;
    
    return @{
             @"x": @(r.origin.x),
             @"y": @(r.origin.y),
             @"width": @(r.size.width),
             @"height": @(r.size.height),
             };
}

@end
