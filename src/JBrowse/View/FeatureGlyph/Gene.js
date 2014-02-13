define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'JBrowse/View/FeatureGlyph/Box',
           'JBrowse/View/FeatureGlyph/ProcessedTranscript'
       ],
       function(
           declare,
           lang,
           array,
           BoxGlyph,
           ProcessedTranscriptGlyph
       ) {

return declare( 'JBrowse/View/FeatureGlyph/Gene', BoxGlyph, {

configSchema: {
    slots: [
        { name: 'transcriptType', type: 'string', defaultValue: 'mRNA',
          description: '`type` field of features that should be considered to be processed transcripts'
        },
        { name: 'transcriptLabelFont', type: 'string',
          description: 'font to use for transcript labels',
          defaultValue : 'normal 10px Univers,Helvetica,Arial,sans-serif'
        },
        { name: 'transcriptLabelColor', type: 'Color', defaultValue: 'black',
          description: 'color to use for transcript labels'
        },
        { name: 'textFont',
          defaultValue: 'bold 12px Univers,Helvetica,Arial,sans-serif'
        },
        { name: 'labelTranscripts', type: 'boolean', defaultValue: true,
          description: 'if set, draw separate text labels naming each transcript'
        },
        { name: 'marginBottom', type: 'integer', defaultValue: 0 }
    ]
},

_boxGlyph: function() {
    return this.__boxGlyph || ( this.__boxGlyph = new BoxGlyph({ track: this.track, browser: this.browser, config: this.config }) );
},
_ptGlyph: function() {
    return this.__ptGlyph || ( this.__ptGlyph = new ProcessedTranscriptGlyph({ track: this.track, browser: this.browser, config: this.config }) );
},

_getFeatureRectangle: function( viewArgs, feature ) {

    // lay out rects for each of the subfeatures
    var subArgs = lang.mixin( {}, viewArgs );
    subArgs.showDescriptions = subArgs.showLabels = false;
    var subfeatures = feature.children();

    // get the rects for the children
    var padding = 1;
    var fRect = {
        l: 0,
        h: 0,
        r: 0,
        w: 0,
        subRects: [],
        blockID: viewArgs.block.id(),
        f: feature,
        glyphType: this.declaredClass
    };
    if( subfeatures && subfeatures.length ) {
        // sort the children by name
        subfeatures.sort( function( a, b ) { return (a.get('name') || '').localeCompare( b.get('name')||'' ); } );

        fRect.l = Infinity;
        fRect.r = -Infinity;

        var transcriptType = this.getConfForFeature( 'transcriptType', feature );
        for( var i = 0; i < subfeatures.length; i++ ) {
            var subRect = ( subfeatures[i].get('type') == transcriptType
                            ? this._ptGlyph()
                            : this._boxGlyph()
                          )._getFeatureRectangle( subArgs, subfeatures[i] );

            padding = i == subfeatures.length-1 ? 0 : 1;
            subRect.t = subRect.rect.t = fRect.h && viewArgs.displayMode != 'collapsed' ? fRect.h+padding : 0;

            if( viewArgs.showLabels && this.getConfForFeature( 'labelTranscripts', subfeatures[i] ) ) {
                var transcriptLabel = this.makeSideLabel(
                    this.track.getFeatureLabel(subfeatures[i]),
                    this.getStyle( subfeatures[i], 'transcriptLabelFont'),
                    subRect
                );
                if( transcriptLabel ) {
                    transcriptLabel.fill = this.getStyle( subfeatures[i], 'transcriptLabelColor' );
                    subRect.label = transcriptLabel;
                    subRect.l -= transcriptLabel.w;
                    subRect.w += transcriptLabel.w;
                    if( transcriptLabel.h > subRect.h )
                        subRect.h = transcriptLabel.h;
                    transcriptLabel.yOffset = Math.floor(subRect.h/2);
                    transcriptLabel.xOffset = 0;
                }
            }

            fRect.subRects.push( subRect );
            fRect.r = Math.max( fRect.r, subRect.l+subRect.w-1 );
            fRect.l = Math.min( fRect.l, subRect.l );
            fRect.h = subRect.t+subRect.h+padding;
        }
    }

    // calculate the width
    fRect.w = Math.max( fRect.r - fRect.l + 1, 2 );
    delete fRect.r;
    fRect.rect = { l: fRect.l, h: fRect.h, w: fRect.w };
    if( viewArgs.displayMode != 'compact' )
        fRect.h += this.getStyle( feature, 'marginBottom' ) || 0;

    // no labels or descriptions if displayMode is collapsed, so stop here
    if( viewArgs.displayMode == "collapsed")
        return fRect;

    // expand the fRect to accommodate labels if necessary
    this._expandRectangleWithLabels( viewArgs, feature, fRect );

    return fRect;
},

layoutFeature: function( viewInfo, layout, feature ) {
    var fRect = this.inherited( arguments );
    if( fRect )
        array.forEach( fRect.subRects, function( subrect ) {
                           subrect.t += fRect.t;
                           subrect.rect.t += fRect.t;
                       });
    return fRect;
},

renderFeature: function( block, context, fRect, viewHints ) {
    if( viewHints.displayMode != 'collapsed' )
        context.clearRect( Math.floor(fRect.l), fRect.t, Math.ceil(fRect.w-Math.floor(fRect.l)+fRect.l), fRect.h );

    var subRects = fRect.subRects;
    for( var i = 0; i < subRects.length; i++ ) {
        var glyphType = subRects[i].glyphType;
        var glyph = viewHints.glyphs[ glyphType ]
            || ( /\bProcessedTranscript$/.test( glyphType )
                 ? this._ptGlyph() : this._boxGlyph()
               );
        glyph.renderFeature( block, context, subRects[i] );
    }

    this.renderLabel( block, context, fRect, viewHints );
    this.renderDescription( block, context, fRect, viewHints );
},

updateStaticElements: function( context, fRect, viewArgs ) {
    this.inherited( arguments );

    var subRects = fRect.subRects;
    for( var i = 0; i < subRects.length; i++ ) {
        subRects[i].glyph.updateStaticElements( context, subRects[i], viewArgs );
    }
}

});
});