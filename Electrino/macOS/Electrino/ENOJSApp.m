//
//  ENOJSApp.m
//  Electrino
//
//  Created by Pauli Olavi Ojala on 03/05/17.
//  Copyright © 2017 Pauli Olavi Ojala.
//
//  This software may be modified and distributed under the terms of the MIT license.  See the LICENSE file for details.
//

#import "ENOJSApp.h"
#import "ENOJavaScriptApp.h"
#import "ENOJSTray.h"


@interface ENOJSApp ()

@property (nonatomic, strong) NSMutableDictionary *eventCallbacks;
@end


@implementation ENOJSApp

- (id)init
{
    self = [super init];
    
    self.eventCallbacks = [NSMutableDictionary dictionary];
    
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

- (BOOL)emitReady:(NSError **)outError
{
    self.jsApp.lastException = nil;
    
    for (JSValue *cb in self.eventCallbacks[@"ready"]) {
        //NSLog(@"%s, %@", __func__, cb);
        
        [cb callWithArguments:@[]];
        
        if (self.jsApp.lastException) {
            if (outError) {
                *outError = [NSError errorWithDomain:kENOJavaScriptErrorDomain
                                                code:102
                                            userInfo:@{
                                                       NSLocalizedDescriptionKey: self.jsApp.lastException,
                                                       @"SourceLineNumber": @(self.jsApp.lastExceptionLine),
                                                       }];
            }
            return NO;
        }
    }
    return YES;
}

- (void)notify:(NSString *)title:(NSString *)content  {
    NSUserNotification *userNotification = [[NSUserNotification alloc] init];
    userNotification.title = title;
    userNotification.informativeText = content;

//    printf("trying to throw {%s %s}\n", [[userNotification title] UTF8String], [[userNotification informativeText] UTF8String]);

    [[NSUserNotificationCenter defaultUserNotificationCenter] deliverNotification:userNotification];
}

- (NSString *)runCmd:(NSString *)command:(JSValue *)cb
{
    NSString* cmd = [@"source ~/.bash_profile \r\n" stringByAppendingFormat:@"%@",command];

    NSTask *task = [[NSTask alloc] init];
    [task setLaunchPath: @"/bin/sh"];
    
    NSPipe *pipe = [NSPipe pipe];
    [task setStandardOutput:pipe];
    NSFileHandle *file = [pipe fileHandleForReading];
    
    NSArray *arguments;
    arguments = [NSArray arrayWithObjects:@"-c",cmd, nil];
    [task setArguments: arguments];
    [task launch];
    [task waitUntilExit];
    //获取返回值并输出
    NSData *data = [file readDataToEndOfFile];
    NSString *string = [[NSString alloc] initWithData: data encoding: NSUTF8StringEncoding];
    
    NSString *temp = [string stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]];
        
        
    NSString *result = [temp stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    return result;
}

- (NSString *)getItem:(NSString *)key
{
    NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
    NSString *value = [userDefaults objectForKey:key];
    return value;
}

- (void)setItem:(NSString *)key:(NSString *)value
{
    NSUserDefaults *userDefaults = [NSUserDefaults standardUserDefaults];
    [userDefaults setObject:key forKey:value];
    [userDefaults synchronize];
}

- (NSString *)readFile:(NSString *)file
{
    NSString* path = [[NSBundle mainBundle] pathForResource:file ofType:@"js"];
    NSString* content = [NSString stringWithContentsOfFile:path
                                                     encoding:NSUTF8StringEncoding
                                                        error:NULL];
    return content;
}

@end
