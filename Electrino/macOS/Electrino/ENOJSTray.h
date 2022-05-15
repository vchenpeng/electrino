//
//  ENOJSTray.h
//  Electrino
//
//  Created by Pauli Ojala on 17/05/2017.
//  Copyright © 2017 Pauli Olavi Ojala.
//
//  This software may be modified and distributed under the terms of the MIT license.  See the LICENSE file for details.
//

#import <Foundation/Foundation.h>
#import "ENOJSNativeImage.h"
#import <JavaScriptCore/JavaScriptCore.h>


@protocol ENOJSTrayExports <JSExport>

- (instancetype)initWithIcon:(id)icon;

- (instancetype)distroy;

JSExportAs(on,
- (void)on:(NSString *)event withCallback:(JSValue *)cb
);

- (NSDictionary *)getBounds;

JSExportAs(setTitle,
- (void)setTitle:(NSString *)title
);

JSExportAs(setIcon,
- (void)setIcon:(NSString *)name
);

@end


@interface ENOJSTray : NSObject <ENOJSTrayExports>

@end
