<?xml version="1.0" encoding="UTF-8"?>
<!--
    Module XSLT - Extraction de Quantités
    Templates pour extraire les Quantity Sets (Qto)
-->

<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ifc="http://www.buildingsmart-tech.org/ifcXML/IFC4/final"
    xmlns:ifc2x3="http://www.iai-tech.org/ifcXML/IFC2x3/FINAL"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    exclude-result-prefixes="ifc ifc2x3 xlink">

    <xsl:import href="common.xsl"/>

    <!-- Template pour extraire les Quantities d'un élément -->
    <xsl:template name="ifc:extract-quantities">
        <xsl:param name="element" as="element()"/>
        <xsl:param name="all-elements" as="element()*"/>
        
        <map>
            <array key="quantity_sets">
                <xsl:for-each select="$element//*[local-name()='IsDefinedBy']">
                    <xsl:variable name="ref" select="ifc:extract-reference(.)"/>
                    <xsl:if test="$ref">
                        <xsl:variable name="rel" select="$all-elements[@id=$ref]"/>
                        <xsl:if test="$rel">
                            <xsl:apply-templates select="$rel" mode="ifc:quantity-set">
                                <xsl:with-param name="all-elements" select="$all-elements"/>
                            </xsl:apply-templates>
                        </xsl:if>
                    </xsl:if>
                </xsl:for-each>
            </array>
        </map>
    </xsl:template>

    <!-- Template pour IfcRelDefinesByProperties (peut aussi être pour quantities) -->
    <xsl:template match="*[local-name()='IfcRelDefinesByProperties']" mode="ifc:quantity-set">
        <xsl:param name="all-elements" as="element()*"/>
        
        <xsl:variable name="qty-def-ref" select="ifc:extract-reference(.//*[local-name()='RelatingPropertyDefinition'])"/>
        <xsl:if test="$qty-def-ref">
            <xsl:variable name="qty-def" select="$all-elements[@id=$qty-def-ref]"/>
            <xsl:if test="$qty-def and local-name($qty-def)='IfcElementQuantity'">
                <xsl:apply-templates select="$qty-def" mode="ifc:quantity-set-definition">
                    <xsl:with-param name="all-elements" select="$all-elements"/>
                </xsl:apply-templates>
            </xsl:if>
        </xsl:if>
    </xsl:template>

    <!-- Template pour IfcElementQuantity -->
    <xsl:template match="*[local-name()='IfcElementQuantity']" mode="ifc:quantity-set-definition">
        <xsl:param name="all-elements" as="element()*"/>
        
        <map>
            <string key="guid"><xsl:value-of select="ifc:extract-guid(.)"/></string>
            <string key="name"><xsl:value-of select="ifc:extract-name(.)"/></string>
            <array key="quantities">
                <xsl:for-each select=".//*[local-name()='Quantities']/*">
                    <xsl:apply-templates select="." mode="ifc:quantity">
                        <xsl:with-param name="all-elements" select="$all-elements"/>
                    </xsl:apply-templates>
                </xsl:for-each>
            </array>
        </map>
    </xsl:template>

    <!-- Template pour une quantité individuelle -->
    <xsl:template match="*[starts-with(local-name(), 'IfcQuantity')]" mode="ifc:quantity">
        <xsl:param name="all-elements" as="element()*"/>
        
        <map>
            <string key="name"><xsl:value-of select="ifc:extract-name(.)"/></string>
            <xsl:variable name="value" select=".//*[local-name()='QuantityValue']"/>
            <xsl:if test="$value">
                <number key="value"><xsl:value-of select="normalize-space($value)"/></number>
            </xsl:if>
            <xsl:variable name="unit" select=".//*[local-name()='Unit']"/>
            <xsl:if test="$unit">
                <string key="unit"><xsl:value-of select="normalize-space($unit)"/></string>
            </xsl:if>
        </map>
    </xsl:template>

</xsl:stylesheet>





