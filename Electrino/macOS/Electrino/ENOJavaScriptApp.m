//
//  ENOJavaScriptApp.m
//  Electrino
//
//  Created by Pauli Olavi Ojala on 03/05/17.
//  Copyright © 2017 Pauli Olavi Ojala.
//
//  This software may be modified and distributed under the terms of the MIT license.  See the LICENSE file for details.
//

#import "ENOJavaScriptApp.h"
#import "ENOJSPath.h"
#import "ENOJSUrl.h"
#import "ENOJSBrowserWindow.h"
#import "ENOJSApp.h"
#import "ENOJSProcess.h"
#import "ENOJSConsole.h"
#import "ENOJSTray.h"
#import "ENOJSNativeImage.h"
#import "ENOJSIPCMain.h"


NSString * const kENOJavaScriptErrorDomain = @"ENOJavaScriptErrorDomain";


@interface ENOJavaScriptApp ()

@property (nonatomic, strong) JSVirtualMachine *jsVM;
@property (nonatomic, strong) JSContext *jsContext;
@property (nonatomic, readwrite, strong) NSDictionary *jsModules;
@property (nonatomic, strong) ENOJSApp *jsAppGlobalObject;
@property (nonatomic, strong) ENOJSIPCMain *jsIPCMain;
@property (nonatomic, strong) ENOJSTray *tray;

@property (nonatomic, assign) BOOL inException;

@end


@implementation ENOJavaScriptApp

+ (instancetype)sharedApp
{
    static ENOJavaScriptApp *s_app = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        s_app = [[self alloc] init];
    });
    return s_app;
}

- (id)init
{
    self = [super init];
    
    
    self.jsVM = [[JSVirtualMachine alloc] init];
    self.jsContext = [[JSContext alloc] initWithVirtualMachine:self.jsVM];
    
    self.jsAppGlobalObject = [[ENOJSApp alloc] init];
    self.jsAppGlobalObject.jsApp = self;
    
    self.jsIPCMain = [[ENOJSIPCMain alloc] init];
    
    // initialize available modules
    
    NSMutableDictionary *modules = [NSMutableDictionary dictionary];
    
    NSString *base64Str = @"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAStJREFUOE9jTMgoa2BkYLRnYGBwYCANHPjP8P8gY2Jm+RWG/wzapOmFqmZkuMqYmFH+nyzNMDOINaC8IJVhy+adDFfvPkKxD6sLKvKTGTZv2Q1XrKGmxBDk4cCwcesehr/MLAw3bt2DG4JigJSkGIOpsR6DtpIcw/U7Dxj+MTEx3L5xh6GkOAPF1qTMCuwGBHvYM3j7e8Ilb1+/zbBp626G4pIs8gy4c/0W2NkDb0CAlzOKF1onzycuDEBeaJs0j4HjxzeGorIchi2bdjLcunGb4QcHF3YDFIX4GMwNdRiUtdQZ7l67yfCPmZlh1a7DYMVhbrYMV+8+JC4dVOUlgQMPPdFgS7FYE5KRrDjDTzZ2og3YT0ZOhDnmACM4OzMyhpCcIxkZrv7//38NAFQalpXe0T44AAAAAElFTkSuQmCC";
    NSData *data = [[NSData alloc] initWithBase64EncodedString:base64Str options:NSDataBase64DecodingIgnoreUnknownCharacters];
    NSImage *image = [[NSImage alloc] initWithData:data];
    ENOJSNativeImageInstance *jsImage = [[ENOJSNativeImageInstance alloc] init];
    
    jsImage.image = image;
    ENOJSTray *tray = [[ENOJSTray alloc] initWithIcon:jsImage];
    self.tray = tray;
    
    modules[@"electrino"] = @{
                              // singletons
                              @"app": self.jsAppGlobalObject,
                              @"ipcMain": self.jsIPCMain,
                              @"nativeImage": [[ENOJSNativeImageAPI alloc] init],
                              
                              // classes that can be constructed
                              @"BrowserWindow": [ENOJSBrowserWindow class],
//                              @"Tray": [ENOJSTray class],
                              @"tray": self.tray
                              };
    
    modules[@"path"] = [[ENOJSPath alloc] init];
    modules[@"url"] = [[ENOJSUrl alloc] init];
    
    // add exception handler and global functions

    __block __weak ENOJavaScriptApp *weakSelf = self;
    
    self.jsContext.exceptionHandler = ^(JSContext *context, JSValue *exception) {
        [weakSelf _jsException:exception];
    };
    
     self.jsContext[@"require"] = ^(NSString *arg) {
         id module = weakSelf.jsModules[arg];
         return module;
     };
    modules[@"require"] = ^(NSString *arg) {
        id module = weakSelf.jsModules[arg];
        return module;
    };
    self.jsContext[@"process"] = [[ENOJSProcess alloc] init];
    self.jsContext[@"console"] = [[ENOJSConsole alloc] init];
    
    self.jsModules = modules;
    return self;
}

- (void)dealloc
{
    self.jsContext.exceptionHandler = NULL;
    self.jsContext[@"require"] = nil;
}

- (void)_jsException:(JSValue *)exception
{
    NSLog(@"%s, %@", __func__, exception);
    
    if (self.inException) {  // prevent recursion, just in case
        return; // --
    }
    
    self.inException = YES;
    
    self.lastException = exception.toString;
    self.lastExceptionLine = [exception valueForProperty:@"line"].toInt32;
    
    self.inException = NO;
}

- (BOOL)loadMainJS:(NSString *)js error:(NSError **)outError
{
    self.lastException = nil;
    
    NSLog(@"%s...", __func__);
    
    [self.jsContext evaluateScript:js];
    
    if (self.lastException) {
        if (outError) {
            *outError = [NSError errorWithDomain:kENOJavaScriptErrorDomain
                                           code:101
                                       userInfo:@{
                                                  NSLocalizedDescriptionKey: self.lastException,
                                                  @"SourceLineNumber": @(self.lastExceptionLine),
                                                  }];
        }
        return NO; // --
    }
    
    NSLog(@"%s done", __func__);
    
    return YES;
}




@end
