//
//  ENOJSTray.m
//  Electrino
//
//  Created by Pauli Ojala on 17/05/2017.
//  Copyright © 2017 Pauli Olavi Ojala.
//
//  This software may be modified and distributed under the terms of the MIT license.  See the LICENSE file for details.
//

#import "ENOJSTray.h"
#import "ENOJSNativeImage.h"


@interface ENOJSTray ()

@property (nonatomic, strong) NSMutableDictionary *eventCallbacks;

@property (nonatomic, strong) NSStatusItem *statusItem;

@end


@implementation ENOJSTray

- (instancetype)initWithIcon:(id)icon
{
    self = [super init];
    
    NSLog(@"%s: %@", __func__, icon);
    
    //获取通知中心单例对象
    NSNotificationCenter * center = [NSNotificationCenter defaultCenter];
    //添加当前类对象为一个观察者，name和object设置为nil，表示接收一切通知
    [center addObserver:self selector:@selector(notice:) name:@"test" object:nil];
    
    self.eventCallbacks = [NSMutableDictionary dictionary];
    
    self.statusItem = [[NSStatusBar systemStatusBar] statusItemWithLength:NSVariableStatusItemLength];
    self.statusItem.highlightMode = YES;
    
    NSMenu *menu = [[NSMenu alloc] initWithTitle:@"view menu"];
    NSMenuItem *item1 = [[NSMenuItem alloc] initWithTitle:@"显示主页" action:@selector(menuClick) keyEquivalent:@""];
    NSMenuItem *item2 = [[NSMenuItem alloc] initWithTitle:@"退出" action:@selector(menuClick) keyEquivalent:@""];
    item1.target = self;
    
    [menu addItem:item1];
    [menu addItem:[NSMenuItem separatorItem]];
    [menu addItem:item2];
//    self.statusItem.menu = menu;
    
    NSStatusBarButton *barButton = self.statusItem.button;
    barButton.action = @selector(statusBarButtonAction:);
    barButton.target = self;
    
    NSImage *image = nil;
    if ([icon respondsToSelector:@selector(image)]) {
        image = [icon image];
        
//        NSSize size1;
//        size1.width = 16;
//        size1.height = 16;
//        [image setSize:size1];
//        
//        NSImage *smallImage = [[NSImage alloc] initWithSize: size1];
//        [smallImage lockFocus];
//        [image setSize:size1];
//        [[NSGraphicsContext currentContext] setImageInterpolation:NSImageInterpolationHigh];
//        [image drawAtPoint:NSZeroPoint fromRect:CGRectMake(0, 0, size1.width, size1.height) operation:NSCompositeCopy fraction:1.0];
//        [smallImage unlockFocus];
//        image = smallImage;
    }
    if (image) {
        image.template = YES;
        barButton.image = image;
        barButton.font = [NSFont systemFontOfSize:12.0 weight:NSFontWeightBlack];
    }
    else {
//        barButton.title = @"4199";
        barButton.font = [NSFont systemFontOfSize:17.0 weight:NSFontWeightBlack];
    }
    NSFont *font = [NSFont systemFontOfSize:14.0 weight:NSFontWeightRegular];
    barButton.font = font;
    
    return self;
}

- (void)on:(NSString *)event withCallback:(JSValue *)cb
{
    if (event.length > 0 && cb) {
        NSMutableArray *cbArr = self.eventCallbacks[event] ?: [NSMutableArray array];
        [cbArr addObject:cb];
        
        self.eventCallbacks[event] = cbArr;
    }
}

- (void)distroy
{
    if (self.statusItem != nil) {
        self.statusItem = nil;
    }
}

-(void)notice:(id)sender{
    NSLog(@"%@",sender);
}

- (NSDictionary *)getBounds
{
    NSView *view = self.statusItem.button;
    NSRect frameInWindow = [view convertRect:view.bounds toView:nil];
    NSRect frameOnScreen = [view.window convertRectToScreen:frameInWindow];
    
    //NSLog(@"frame %@ - window %@ - screen %@ / %p, %p", NSStringFromRect(view.frame), NSStringFromRect(frameInWindow), NSStringFromRect(frameOnScreen), view, view.window);
    
    return @{
             @"x": @(frameOnScreen.origin.x),
             @"y": @(frameOnScreen.origin.y),
             @"width": @(frameOnScreen.size.width),
             @"height": @(frameOnScreen.size.width),
             };
}


#pragma mark --- actions ---

- (IBAction)statusBarButtonAction:(id)sender
{
    //NSStatusBarButton *barButton = self.statusItem.button;
    
    for (JSValue *cb in self.eventCallbacks[@"click"]) {
        //NSLog(@"%s, %@", __func__, cb);
        
        [cb callWithArguments:@[]];
        
    }
    
    /*
     if (self.popover.shown) {
     [self.popover close];
     } else {
     [self.popover showRelativeToRect:barButton.bounds ofView:barButton preferredEdge:NSMinYEdge];
     
     if ( !self.popoverTransiencyMonitor) {
     self.popoverTransiencyMonitor = [NSEvent addGlobalMonitorForEventsMatchingMask:(NSLeftMouseDownMask | NSRightMouseDownMask | NSKeyUpMask) handler:^(NSEvent *event) {
     [NSEvent removeMonitor:self.popoverTransiencyMonitor];
     self.popoverTransiencyMonitor = nil;
     [self.popover close];
     }];
     }
     }*/
}

- (void)setTitle:(NSString *)title
{
//    NSString *str = [title stringByAppendingString: @"test"];
    
    self.statusItem.title = title;
    self.statusItem.highlightMode = TRUE;
    self.statusItem.enabled = TRUE;
}

- (void)setIcon:(NSString *)name
{
    NSStatusBarButton *barButton = self.statusItem.button;
    barButton.action = @selector(statusBarButtonAction:);
    barButton.target = self;
    barButton.image = [NSImage imageNamed:name];
}

@end
